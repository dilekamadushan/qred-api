import { Transaction } from '../../src/db/models/transaction';
import * as TransactionService from '../../src/services/transactions.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { Op } from 'sequelize';

jest.mock('../../src/db/models/transaction');

function createMockTransaction(overrides = {}) {
  return {
    id: 'txn_1',
    companyId: 'cmp_123',
    cardId: 'card_123',
    userId: 'user_123',
    createdAt: new Date(),
    merchantName: 'Merchant',
    description: 'Test purchase',
    category: 'Food',
    amountMinor: 1000,
    currency: 'SEK',
    direction: 'debit',
    status: 'booked',
    merchantUrl: 'https://merchant.com',
    ...overrides,
  };
}

describe('TransactionService', () => {
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(LogUtils, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactionsForCompany', () => {
    it('returns transactions for a company', async () => {
      const mockTxns = [createMockTransaction()];
      (Transaction.findAll as jest.Mock).mockResolvedValueOnce(mockTxns);
      const result = await TransactionService.getTransactionsForCompany('cmp_123', 'user_123');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'txn_1',
          merchantName: 'Merchant',
          amount: { amountMinor: 1000, currency: 'SEK' },
        })
      );
      expect(result.page).toEqual(
        expect.objectContaining({
          pageSize: 10,
          hasMore: false,
        })
      );
    });

    it('applies status, date range, search and sorting options', async () => {
      (Transaction.findAll as jest.Mock).mockResolvedValueOnce([createMockTransaction()]);

      await TransactionService.getTransactionsForCompany('cmp_123', 'user_123', {
        status: 'booked',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        pageSize: 25,
        sortBy: 'amount',
        sortOrder: 'asc',
        search: 'coffee',
      });

      const findAllArg = (Transaction.findAll as jest.Mock).mock.calls[0][0];
      expect(findAllArg.order).toEqual([
        ['amountMinor', 'ASC'],
        ['id', 'ASC'],
      ]);
      expect(findAllArg.limit).toBe(26);
      expect(findAllArg.where[Op.and]).toBeDefined();
      expect(findAllArg.where[Op.and][0]).toEqual({ companyId: 'cmp_123', userId: 'user_123' });
    });

    it('applies cursor pagination clause', async () => {
      (Transaction.findAll as jest.Mock).mockResolvedValueOnce([createMockTransaction()]);
      const cursor = Buffer.from(
        JSON.stringify({ createdAt: '2026-04-10T10:16:05.000Z', id: 'txn_100' })
      ).toString('base64');

      await TransactionService.getTransactionsForCompany('cmp_123', 'user_123', {
        cursor,
        sortOrder: 'desc',
      });

      const findAllArg = (Transaction.findAll as jest.Mock).mock.calls[0][0];
      expect(findAllArg.where[Op.and]).toBeDefined();
    });

    it('logs error and throws if DB fails', async () => {
      (Transaction.findAll as jest.Mock).mockRejectedValueOnce(new Error('db error'));
      await expect(
        TransactionService.getTransactionsForCompany('cmp_123', 'user_123')
      ).rejects.toThrow('db error');
      expect(logErrorSpy).toHaveBeenCalledWith(
        'TransactionService',
        expect.stringContaining('Database error'),
        expect.any(Error)
      );
    });
  });
});
