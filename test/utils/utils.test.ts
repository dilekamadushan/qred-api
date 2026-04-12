import { buildTransactionQueryOptions } from '../../src/utils/transactions';
import { buildPaginationLinks } from '../../src/utils/pagination';
import type { Request } from 'express';

describe('utils/transactions', () => {
  describe('buildTransactionQueryOptions', () => {
    it('should parse all query options correctly', () => {
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
      const result = buildTransactionQueryOptions(query);

      expect(result).toEqual({
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

    it('should default pageSize to 10 if not provided or invalid', () => {
      expect(buildTransactionQueryOptions({}).pageSize).toBe(10);
      expect(buildTransactionQueryOptions({ pageSize: 'foo' }).pageSize).toBe(10);
    });
  });
});

describe('utils/pagination', () => {
  describe('buildPaginationLinks', () => {
    function mockRequest(url: string): Request {
      return {
        protocol: 'http',
        get: () => 'localhost:3000',
        originalUrl: url,
      } as unknown as Request;
    }

    it('should build self and next links when hasMore and nextCursor', () => {
      const req = mockRequest('/api/v1/companies/cmp_123/transactions?pageSize=10');
      const page = { pageSize: 10, hasMore: true, nextCursor: 'abc' };
      const { self, next } = buildPaginationLinks(req, page);

      expect(self).toContain('/api/v1/companies/cmp_123/transactions');
      expect(next).toContain('cursor=abc');
      expect(next).toContain('pageSize=10');
    });

    it('should set next to null if no more pages', () => {
      const req = mockRequest('/api/v1/companies/cmp_123/transactions');
      const page = { pageSize: 10, hasMore: false };
      const { next } = buildPaginationLinks(
        req,
        page as { pageSize: number; hasMore: boolean; nextCursor?: string | null }
      );

      expect(next).toBeNull();
    });
  });
});
