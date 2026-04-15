import { Transaction } from '../../src/db/models/transaction';
import * as TransactionService from '../../src/services/transactions.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { Op } from 'sequelize';
import { DbCircuitOpenError, InternalServerError } from '../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';

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
        sortOrder: 'ASC',
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
        sortOrder: 'DESC',
      });

      const findAllArg = (Transaction.findAll as jest.Mock).mock.calls[0][0];
      expect(findAllArg.where[Op.and]).toBeDefined();
    });

    it('logs error and throws if DB fails', async () => {
      (Transaction.findAll as jest.Mock).mockRejectedValueOnce(new Error('db error'));
      await expect(
        TransactionService.getTransactionsForCompany('cmp_123', 'user_123')
      ).rejects.toBeInstanceOf(InternalServerError);
      expect(logErrorSpy).toHaveBeenCalledWith(
        'TransactionService',
        expect.stringContaining('Error querying transactions'),
        expect.any(Error)
      );
    });

    describe('when circuit breaker execution fails', () => {
      it('rethrows DbCircuitOpenError', async () => {
        const error = new DbCircuitOpenError();
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(error);

        await expect(
          TransactionService.getTransactionsForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
      });

      it('propagates non-circuit errors', async () => {
        jest
          .spyOn(sharedDbCircuitBreaker, 'execute')
          .mockRejectedValueOnce(new Error('breaker failure'));

        await expect(
          TransactionService.getTransactionsForCompany('cmp_123', 'user_123')
        ).rejects.toThrow('breaker failure');
      });
    });
  });

  describe('getTransactionPreviewForCompany', () => {
    it('returns preview items and remaining count', async () => {
      (Transaction.findAll as jest.Mock).mockResolvedValueOnce([
        createMockTransaction({
          id: 'txn_preview_1',
          description: 'Coffee purchase',
          amountMinor: 4500,
          createdAt: new Date('2026-04-10T10:16:05.000Z'),
          merchantUrl: 'https://app.qred.example.com/transactions/txn_preview_1',
        }),
      ]);
      (Transaction.count as jest.Mock).mockResolvedValueOnce(4);

      const result = await TransactionService.getTransactionPreviewForCompany(
        'cmp_123',
        'user_123',
        3
      );

      expect(result).toEqual({
        items: [
          {
            id: 'txn_preview_1',
            description: 'Coffee purchase',
            amount: 45,
            createdAt: '2026-04-10T10:16:05.000Z',
            merchantUrl: 'https://app.qred.example.com/transactions/txn_preview_1',
          },
        ],
        remainingTransactions: 3,
      });
    });

    it('queries preview transactions for company and user with limit', async () => {
      (Transaction.findAll as jest.Mock).mockResolvedValueOnce([]);
      (Transaction.count as jest.Mock).mockResolvedValueOnce(0);

      await TransactionService.getTransactionPreviewForCompany('cmp_123', 'user_123', 2);

      expect(Transaction.findAll).toHaveBeenCalledWith({
        where: { companyId: 'cmp_123', userId: 'user_123' },
        attributes: ['id', 'description', 'amountMinor', 'createdAt', 'merchantUrl'],
        order: [
          ['createdAt', 'desc'],
          ['id', 'desc'],
        ],
        limit: 2,
        raw: true,
      });
      expect(Transaction.count).toHaveBeenCalledWith({
        where: { companyId: 'cmp_123', userId: 'user_123' },
      });
    });

    describe('when circuit breaker execution fails', () => {
      it('rethrows DbCircuitOpenError', async () => {
        const error = new DbCircuitOpenError();
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(error);

        await expect(
          TransactionService.getTransactionPreviewForCompany('cmp_123', 'user_123', 2)
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
      });

      it('propagates non-circuit errors', async () => {
        jest
          .spyOn(sharedDbCircuitBreaker, 'execute')
          .mockRejectedValueOnce(new Error('breaker failure'));

        await expect(
          TransactionService.getTransactionPreviewForCompany('cmp_123', 'user_123', 2)
        ).rejects.toThrow('breaker failure');
      });
    });
  });
});
