import { getTransactions } from '../../src/controllers/transactionsController';
import * as TransactionService from '../../src/services/transactions.service';
import { DbCircuitOpenError } from '../../src/services/circuitBreaker.service';
import { HTTP_STATUS } from '../../src/common/constants';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

type MockQuery = {
  [key: string]: unknown;
};
const mockRequest = (
  params: ParamsDictionary = {},
  query: MockQuery = {},
  user: { userId: string } = { userId: 'test-user-id' }
): Request =>
  ({
    params,
    query,
    user,
  }) as unknown as Request;

const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

describe('transactionsController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('returns 200 and transactions', async () => {
      const data = {
        items: [
          {
            id: 'txn_1',
            createdAt: new Date().toISOString(),
            merchantName: 'Merchant',
            category: 'Food',
            amount: { amountMinor: 1000, currency: 'SEK' },
            direction: 'debit' as const,
            status: 'booked' as const,
            merchantUrl: 'https://merchant.com',
          },
        ],
        page: {
          pageSize: 20,
          hasMore: false,
          nextCursor: null,
        },
      };
      jest.spyOn(TransactionService, 'getTransactionsForCompany').mockResolvedValue(data);
      const req = mockRequest({ companyId: 'cmp_123' }) as Request & {
        protocol: string;
        get: (name: string) => string;
        originalUrl: string;
      };
      req.protocol = 'http';
      req.get = jest
        .fn()
        .mockImplementation((name: string) =>
          name.toLowerCase() === 'host' ? 'localhost:3000' : ''
        );
      req.originalUrl = '/api/v1/companies/cmp_123/transactions?pageSize=20';
      const res = mockResponse();
      await getTransactions(req, res);
      expect(TransactionService.getTransactionsForCompany).toHaveBeenCalledWith(
        'cmp_123',
        'test-user-id',
        {
          cursor: undefined,
          status: undefined,
          dateFrom: undefined,
          dateTo: undefined,
          pageSize: 10,
          sortBy: undefined,
          sortOrder: undefined,
          search: undefined,
        }
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data,
          links: expect.objectContaining({
            self: expect.stringContaining('/api/v1/companies/cmp_123/transactions'),
          }),
        })
      );
    });

    it('returns 503 if circuit breaker is open', async () => {
      jest
        .spyOn(TransactionService, 'getTransactionsForCompany')
        .mockRejectedValue(new DbCircuitOpenError());
      const req = mockRequest({ companyId: 'cmp_123' });
      const res = mockResponse();

      await expect(getTransactions(req, res)).rejects.toBeInstanceOf(DbCircuitOpenError);
    });

    it('calls next(err) on unexpected error', async () => {
      const error = new Error('unexpected');
      jest.spyOn(TransactionService, 'getTransactionsForCompany').mockRejectedValue(error);
      const req = mockRequest({ companyId: 'cmp_123' });
      const res = mockResponse();

      await expect(getTransactions(req, res)).rejects.toThrow('unexpected');
    });

    it('passes full query options to the service', async () => {
      const data = {
        items: [],
        page: { pageSize: 25, hasMore: false, nextCursor: null },
      };
      jest.spyOn(TransactionService, 'getTransactionsForCompany').mockResolvedValue(data);
      const req = mockRequest(
        { companyId: 'cmp_123' },
        {
          cursor: 'abc',
          status: 'booked',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          pageSize: '25',
          sortBy: 'amount',
          sortOrder: 'asc',
          search: 'coffee',
        }
      ) as Request & {
        protocol: string;
        get: (name: string) => string;
        originalUrl: string;
      };
      req.protocol = 'http';
      req.get = jest.fn().mockReturnValue('localhost:3000');
      req.originalUrl = '/api/v1/companies/cmp_123/transactions?pageSize=25';
      const res = mockResponse();

      await getTransactions(req, res);

      expect(TransactionService.getTransactionsForCompany).toHaveBeenCalledWith(
        'cmp_123',
        'test-user-id',
        {
          cursor: 'abc',
          status: 'booked',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          pageSize: 25,
          sortBy: 'amount',
          sortOrder: 'asc',
          search: 'coffee',
        }
      );
    });
  });
});
