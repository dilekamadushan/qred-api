import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import type {
  TransactionCursorPayload,
  TransactionListData,
  TransactionQueryOptions,
} from '../common/types/types';
import { Transaction } from '../db/models/transaction';
import { buildCursorPage, decodeCursor } from '../common/utils/pagination';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import { DEFAULT_PAGE_SIZE, SORT_ORDER } from '../common/constants';
import { InternalServerError } from '../common/errors/appHttpError';
import {
  buildTransactionPaginationClause,
  buildTransactionWhereClauses,
  mapTransactionToSummary,
} from '../common/utils/transactions';

import type { TransactionPreviewResult } from '../common/types/types';

export function getTransactionsForCompany(
  companyId: string,
  userId: string,
  options: TransactionQueryOptions = {}
): Promise<TransactionListData> {
  return sharedDbCircuitBreaker.execute(() => queryTransactions(companyId, userId, options));
}

export async function getTransactionPreviewForCompany(
  companyId: string,
  userId: string,
  previewLimit: number
): Promise<TransactionPreviewResult> {
  return sharedDbCircuitBreaker.execute(() =>
    queryTransactionPreview(companyId, userId, previewLimit)
  );
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
      sortOrder = SORT_ORDER.DESC,
    } = options;
    // Build where clauses based on filters
    const andClauses = buildTransactionWhereClauses(companyId, userId, options);
    let where: WhereOptions = andClauses.length === 1 ? andClauses[0] : { [Op.and]: andClauses };

    const decoded: TransactionCursorPayload | null = cursor
      ? decodeCursor<TransactionCursorPayload>(cursor)
      : null;
    if (decoded) {
      const paginationClause = buildTransactionPaginationClause(decoded, sortOrder);
      where = { [Op.and]: [...andClauses, paginationClause] };
    }

    const dbSortField = sortBy === 'amount' ? 'amountMinor' : sortBy;
    const normalizedSortOrder = sortOrder.toUpperCase() as [keyof typeof SORT_ORDER][number];

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
    // Build pagination info
    const { pageItems, page } = buildCursorPage(transactions, pageSize, (lastItem) => ({
      createdAt: new Date(lastItem.createdAt).toISOString(),
      id: lastItem.id,
    }));
    const items = pageItems.map((transaction) => mapTransactionToSummary(transaction));

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
    const [transactionsPage, totalCount] = await Promise.all([
      queryTransactions(companyId, userId, {
        pageSize: previewLimit,
      }),
      Transaction.count({ where }),
    ]);
    // queryTransactions always sends one more
    const transactions = transactionsPage.items.slice(0, previewLimit);

    return {
      items: transactions,
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
