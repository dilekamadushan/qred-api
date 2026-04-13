import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import type {
  CursorPayload,
  PageInfo,
  TransactionListData,
  TransactionQueryOptions,
  TransactionSummary,
} from '../common/types/types';
import type { components } from '../generated/openapi';
import { Transaction } from '../db/models/transaction';
import { decodeCursor, encodeCursor } from '../common/utils/pagination';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { DEFAULT_PAGE_SIZE, SORT_ORDER } from '../common/constants';
import type { Transaction as TransactionModel } from '../db/models/transaction';
import type { InferAttributes } from 'sequelize';
import { DbCircuitOpenError, InternalServerError } from '../common/errors/appHttpError';

function buildWhereClauses(
  companyId: string,
  userId: string,
  options: TransactionQueryOptions
): WhereOptions[] {
  const { status, search, dateFrom, dateTo } = options;
  const clauses: WhereOptions[] = [{ companyId, userId }];
  if (status) clauses.push({ status });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    clauses.push({
      [Op.or]: [{ merchantName: { [Op.like]: term } }, { description: { [Op.like]: term } }],
    });
  }

  const createdAtClause: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
  if (dateFrom) createdAtClause[Op.gte] = new Date(`${dateFrom}T00:00:00.000Z`);
  if (dateTo) createdAtClause[Op.lte] = new Date(`${dateTo}T23:59:59.999Z`);
  if (dateFrom || dateTo) {
    clauses.push({ createdAt: createdAtClause });
  }

  return clauses;
}

function buildPaginationClause(decoded: CursorPayload, sortOrder: string) {
  return sortOrder === SORT_ORDER.ASC
    ? {
        [Op.or]: [
          { createdAt: { [Op.gt]: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { [Op.gt]: decoded.id } },
        ],
      }
    : {
        [Op.or]: [
          { createdAt: { [Op.lt]: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { [Op.lt]: decoded.id } },
        ],
      };
}

type TransactionRaw = InferAttributes<TransactionModel>;
type TransactionPreviewValue =
  components['schemas']['DashboardResponse']['data']['transactions']['value'];
type TransactionPreviewItem = NonNullable<TransactionPreviewValue>['items'][number];

export type TransactionPreviewResult = {
  items: TransactionPreviewItem[];
  remainingTransactions: number;
};

function mapTransactionToSummary(transaction: TransactionRaw): TransactionSummary {
  return {
    id: transaction.id,
    createdAt: new Date(transaction.createdAt).toISOString(),
    merchantName: transaction.merchantName,
    category: transaction.category,
    amount: { amountMinor: transaction.amountMinor, currency: transaction.currency },
    direction: transaction.direction,
    status: transaction.status,
    merchantUrl: transaction.merchantUrl,
  };
}

function toDashboardAmount(amountMinor: number): number {
  return Number((amountMinor / 100).toFixed(2));
}

async function queryTransactions(
  companyId: string,
  userId: string,
  options: TransactionQueryOptions = {}
): Promise<TransactionListData> {
  try {
    const {
      cursor,
      pageSize = DEFAULT_PAGE_SIZE,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const andClauses = buildWhereClauses(companyId, userId, options);
    let where: WhereOptions = andClauses.length === 1 ? andClauses[0] : { [Op.and]: andClauses };

    const decoded: CursorPayload | null = cursor ? decodeCursor<CursorPayload>(cursor) : null;
    if (decoded) {
      const paginationClause = buildPaginationClause(decoded, sortOrder);
      where = { [Op.and]: [...andClauses, paginationClause] };
    }

    const dbSortField = sortBy === 'amount' ? 'amountMinor' : sortBy;
    const normalizedSortOrder = sortOrder.toUpperCase() as 'ASC' | 'DESC';

    // Fetch one extra to determine if there is a next page
    const transactions = await Transaction.findAll({
      where,
      order: [
        [dbSortField, normalizedSortOrder],
        ['id', normalizedSortOrder],
      ],
      limit: pageSize + 1,
      raw: true,
    });

    const hasMore = transactions.length > pageSize;
    const pageItems = transactions.slice(0, pageSize);
    const items = pageItems.map(mapTransactionToSummary);

    let nextCursor: string | null = null;
    if (hasMore && pageItems.length > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      nextCursor = encodeCursor({
        createdAt: new Date(lastItem.createdAt).toISOString(),
        id: lastItem.id,
      });
    }

    const page: PageInfo = {
      nextCursor,
      pageSize,
      hasMore,
    };

    return {
      items,
      page,
    };
  } catch (error) {
    logError(
      'TransactionService',
      `Error querying transactions for companyId: ${companyId}`,
      error
    );
    throw new InternalServerError({ detail: 'Failed to load transactions data.' });
  }
}

async function queryTransactionPreview(
  companyId: string,
  userId: string,
  previewLimit: number
): Promise<TransactionPreviewResult> {
  try {
    const where = { companyId, userId };
    const [transactions, totalCount] = await Promise.all([
      Transaction.findAll({
        where,
        attributes: ['id', 'description', 'amountMinor', 'createdAt', 'merchantUrl'],
        order: [
          ['createdAt', 'DESC'],
          ['id', 'DESC'],
        ],
        limit: previewLimit,
        raw: true,
      }),
      Transaction.count({ where }),
    ]);

    return {
      items: transactions.map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        amount: toDashboardAmount(transaction.amountMinor),
        createdAt: new Date(transaction.createdAt).toISOString(),
        merchantUrl: transaction.merchantUrl,
      })),
      remainingTransactions: Math.max(totalCount - transactions.length, 0),
    };
  } catch (error) {
    logError(
      'TransactionService',
      `Error querying transaction preview for companyId: ${companyId}`,
      error
    );
    throw new InternalServerError({ detail: 'Failed to load transaction preview data.' });
  }
}

export const transactionsCircuitBreaker = sharedDbCircuitBreaker;

export async function getTransactionsForCompany(
  companyId: string,
  userId: string,
  options: TransactionQueryOptions = {}
): Promise<TransactionListData> {
  try {
    return await transactionsCircuitBreaker.execute(() =>
      queryTransactions(companyId, userId, options)
    );
  } catch (error) {
    if (error instanceof DbCircuitOpenError) {
      logWarn('TransactionService', `Circuit breaker is OPEN for companyId: ${companyId}`);
      throw error;
    }

    throw new InternalServerError({ detail: 'Failed to load transactions data.' });
  }
}

export async function getTransactionPreviewForCompany(
  companyId: string,
  userId: string,
  previewLimit: number
): Promise<TransactionPreviewResult> {
  try {
    return await transactionsCircuitBreaker.execute(() =>
      queryTransactionPreview(companyId, userId, previewLimit)
    );
  } catch (error) {
    if (error instanceof DbCircuitOpenError) {
      logWarn('TransactionService', `Circuit breaker is OPEN for companyId: ${companyId}`);
      throw error;
    }

    throw new InternalServerError({ detail: 'Failed to load transaction preview data.' });
  }
}
