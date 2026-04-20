import { Op } from 'sequelize';
import {
  buildTransactionPaginationClause,
  buildTransactionQueryOptions,
  buildTransactionWhereClauses,
  mapTransactionToSummary,
} from '../../../src/common/utils/transactions';
import type { Transaction } from '../../../src/db/models';

describe('utils/transactions (extracted helpers)', () => {
  describe('buildTransactionQueryOptions', () => {
    it('parses full query options', () => {
      const query = {
        cursor: 'abc',
        status: 'booked',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        pageSize: '25',
        sortBy: 'amount',
        sortOrder: 'asc',
        search: 'coffee',
      };

      expect(buildTransactionQueryOptions(query)).toEqual({
        cursor: 'abc',
        status: 'booked',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        pageSize: 25,
        sortBy: 'amount',
        sortOrder: 'asc',
        search: 'coffee',
      });
    });

    it('defaults pageSize when invalid', () => {
      expect(buildTransactionQueryOptions({}).pageSize).toBe(10);
      expect(buildTransactionQueryOptions({ pageSize: 'foo' }).pageSize).toBe(10);
    });
  });

  describe('buildTransactionWhereClauses', () => {
    it('returns base clause with companyId and userId', () => {
      const clauses = buildTransactionWhereClauses('cmp_1', 'user_1', {});
      expect(clauses[0]).toEqual({ companyId: 'cmp_1', userId: 'user_1' });
    });

    it('adds status, search, and date filters', () => {
      const clauses = buildTransactionWhereClauses('cmp_1', 'user_1', {
        status: 'booked',
        search: 'coffee',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
      });

      expect(clauses).toHaveLength(4);
      expect(clauses[1]).toEqual({ status: 'booked' });

      const searchClause = clauses[2] as Record<symbol, unknown>;
      expect(Object.getOwnPropertySymbols(searchClause)).toContain(Op.or);

      expect(clauses[3]).toEqual({
        createdAt: {
          [Op.gte]: new Date('2026-04-01T00:00:00.000Z'),
          [Op.lte]: new Date('2026-04-30T23:59:59.999Z'),
        },
      });
    });
  });

  describe('buildTransactionPaginationClause', () => {
    const decoded = { createdAt: '2026-04-10T10:16:05.000Z', id: 'txn_100' };

    it('builds ASC cursor clause', () => {
      const clause = buildTransactionPaginationClause(decoded, 'asc') as Record<symbol, unknown>;
      expect(Object.getOwnPropertySymbols(clause)).toContain(Op.or);
    });

    it('builds DESC cursor clause', () => {
      const clause = buildTransactionPaginationClause(decoded, 'desc') as Record<symbol, unknown>;
      expect(Object.getOwnPropertySymbols(clause)).toContain(Op.or);
    });
  });

  describe('mapTransactionToSummary', () => {
    it('maps transaction row to API summary', () => {
      const summary = mapTransactionToSummary({
        id: 'txn_1',
        createdAt: new Date('2026-04-10T10:16:05.000Z'),
        merchantName: 'Coffee Shop',
        category: 'coffee',
        amountMinor: 4500,
        currency: 'SEK',
        direction: 'debit',
        status: 'booked',
        merchantUrl: 'https://merchant.example/txn_1',
      } as Transaction);

      expect(summary).toEqual({
        id: 'txn_1',
        createdAt: '2026-04-10T10:16:05.000Z',
        merchantName: 'Coffee Shop',
        category: 'coffee',
        amount: { amountMinor: 4500, currency: 'SEK' },
        direction: 'debit',
        status: 'booked',
        merchantUrl: 'https://merchant.example/txn_1',
      });
    });
  });
});
