import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { HTTP_STATUS } from '../../src/common/constants';
import { DbCircuitOpenError, NotFoundError } from '../../src/common/errors/appHttpError';
import { getRemainingSpend } from '../../src/controllers/spend.controller';
import * as SpendService from '../../src/services/spend.service';

const mockRequest = (
  params: ParamsDictionary = {},
  user: { userId: string } = { userId: 'test-user-id' }
): Request =>
  ({
    params,
    user,
    originalUrl: `/api/v1/companies/${params.companyId}/remaining-spend`,
  }) as unknown as Request;

const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('spendController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRemainingSpend', () => {
    describe('when spend summary is found', () => {
      it('returns 200 and spend summary payload', async () => {
        const spend = {
          spent: 380000,
          limit: 500000,
          remaining: 120000,
          utilizationPercent: 76,
          currency: 'SEK',
          label: 'based on your set limit',
        };

        jest
          .spyOn(SpendService, 'getRemainingSpendForCompany')
          .mockResolvedValue(
            spend as Awaited<ReturnType<typeof SpendService.getRemainingSpendForCompany>>
          );

        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getRemainingSpend(req, res);

        expect(SpendService.getRemainingSpendForCompany).toHaveBeenCalledWith(
          'test-user-id',
          'cmp_123'
        );
        expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
        expect(res.json).toHaveBeenCalledWith(spend);
      });
    });

    describe('when spend summary is not found', () => {
      it('throws a 404 app error', async () => {
        jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockRejectedValue(
          new NotFoundError({
            detail: 'No remaining spend data found for company cmp_123.',
            code: 'remaining_spend_not_found',
          })
        );
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getRemainingSpend(req, res)).rejects.toMatchObject({
          status: HTTP_STATUS.NOT_FOUND,
          code: 'remaining_spend_not_found',
        });
      });
    });

    describe('when the circuit breaker is open', () => {
      it('propagates the error to middleware', async () => {
        jest
          .spyOn(SpendService, 'getRemainingSpendForCompany')
          .mockRejectedValue(new DbCircuitOpenError());
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getRemainingSpend(req, res)).rejects.toBeInstanceOf(DbCircuitOpenError);
      });
    });

    describe('when an unexpected error occurs', () => {
      it('propagates the error to middleware', async () => {
        const error = new Error('unexpected');
        jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockRejectedValue(error);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getRemainingSpend(req, res)).rejects.toThrow('unexpected');
      });
    });
  });
});
