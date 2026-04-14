import { Op, type WhereOptions } from 'sequelize';
import type { TransactionQueryOptions } from '../types/types';
import type { TransactionSummary } from '../types/types';
import { SORT_ORDER } from '../constants';
import { toMajorAmountFromMinor } from './money';

export const buildTransactionQueryOptions = (
  query: Record<string, unknown>
): TransactionQueryOptions => {
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
};

export const buildTransactionWhereClauses = (
  companyId: string,
  userId: string,
  options: TransactionQueryOptions
): WhereOptions[] => {
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
};

export const buildTransactionPaginationClause = (
  decoded: { createdAt: string; id: string },
  sortOrder: string
): WhereOptions => {
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
};

export const mapTransactionToSummary = (transaction: {
  id: string;
  createdAt: Date | string;
  merchantName: string;
  category: string;
  amountMinor: number;
  currency: string;
  direction: TransactionSummary['direction'];
  status: TransactionSummary['status'];
  merchantUrl: string;
}): TransactionSummary => {
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
};

export const toDashboardAmount = (amountMinor: number): number => {
  return toMajorAmountFromMinor(amountMinor);
};
