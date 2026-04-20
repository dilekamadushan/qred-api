import { buildTransactionQueryOptions } from '../../../src/common/utils/transactions';

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
