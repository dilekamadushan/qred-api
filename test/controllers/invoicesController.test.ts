import { getLatestInvoice } from '../../src/controllers/invoices.controller';
import * as InvoiceService from '../../src/services/invoices.service';
import { DbCircuitOpenError } from '../../src/common/errors/appHttpError';
import { HTTP_STATUS } from '../../src/common/constants';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

const mockRequest = (
  params: ParamsDictionary = {},
  user: { userId: string } = { userId: 'test-user-id' }
): Request =>
  ({
    params,
    user,
    originalUrl: `/api/v1/companies/${params.companyId}/invoices/latest`,
  }) as unknown as Request;

const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('invoicesController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestInvoice', () => {
    describe('when an invoice is found', () => {
      it('returns 200 and mapped invoice payload', async () => {
        const invoice = {
          id: 'inv_1',
          label: 'Invoice due',
          dueDate: '2099-12-31',
          amountMinor: 10000,
          currency: 'SEK',
          status: 'due' as const,
        };

        jest
          .spyOn(InvoiceService, 'getLatestInvoiceForCompany')
          .mockResolvedValue(
            invoice as Awaited<ReturnType<typeof InvoiceService.getLatestInvoiceForCompany>>
          );
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getLatestInvoice(req, res);

        expect(InvoiceService.getLatestInvoiceForCompany).toHaveBeenCalledWith('cmp_123');
        expect(res.json).toHaveBeenCalledWith({
          label: invoice.label,
          dueDate: invoice.dueDate,
          amount: {
            amountMinor: invoice.amountMinor,
            currency: invoice.currency,
          },
        });
      });
    });

    describe('when no invoice is found', () => {
      it('throws a 404 app error', async () => {
        jest.spyOn(InvoiceService, 'getLatestInvoiceForCompany').mockResolvedValue(null);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getLatestInvoice(req, res)).rejects.toMatchObject({
          status: HTTP_STATUS.NOT_FOUND,
          code: 'invoice_not_found',
        });
      });
    });

    describe('when the circuit breaker is open', () => {
      it('propagates the error to middleware', async () => {
        jest
          .spyOn(InvoiceService, 'getLatestInvoiceForCompany')
          .mockRejectedValue(new DbCircuitOpenError());
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getLatestInvoice(req, res)).rejects.toBeInstanceOf(DbCircuitOpenError);
      });
    });

    describe('when an unexpected error occurs', () => {
      it('propagates the error to middleware', async () => {
        const error = new Error('unexpected');
        jest.spyOn(InvoiceService, 'getLatestInvoiceForCompany').mockRejectedValue(error);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getLatestInvoice(req, res)).rejects.toThrow('unexpected');
      });
    });
  });
});
