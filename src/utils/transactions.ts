import type { TransactionQueryOptions } from '../common/types';

export function buildTransactionQueryOptions(
  query: Record<string, unknown>
): TransactionQueryOptions {
  const rawPageSize = Number(query.pageSize);
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(Math.max(rawPageSize, 1), 100) : 10;
  return {
    cursor: query.cursor as string | undefined,
    status: query.status as TransactionQueryOptions['status'],
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    pageSize,
    sortBy: query.sortBy as TransactionQueryOptions['sortBy'],
    sortOrder: query.sortOrder as TransactionQueryOptions['sortOrder'],
    search: query.search as string | undefined,
  };
}
