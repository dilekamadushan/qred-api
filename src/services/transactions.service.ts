import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import type { GenericError } from '../common/types';
import type {
  CursorPayload,
  PageInfo,
  TransactionListData,
  TransactionQueryOptions,
  TransactionSummary,
} from '../common/types';
import { Transaction } from '../db/models/transaction';
import { decodeCursor, encodeCursor } from '../common/utils/cursor';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { DEFAULT_PAGE_SIZE, ERROR_CODES, SORT_ORDER } from '../common/constants';
import type { Transaction as TransactionModel } from '../db/models/transaction';
import type { InferAttributes } from 'sequelize';

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
    throw error;
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
    const err = error as GenericError;
    if (err.code === ERROR_CODES.CIRCUIT_BREAKER_OPEN_CODE) {
      logWarn('TransactionService', `Circuit breaker is OPEN for companyId: ${companyId}`);
    } else {
      logError('TransactionService', `Database error for companyId: ${companyId}`, error);
    }
    throw error;
  }
}
