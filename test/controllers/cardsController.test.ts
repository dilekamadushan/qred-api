import { getDefaultCard } from '../../src/controllers/cardsController';
import * as CardService from '../../src/services/cards.service';
import { DbCircuitOpenError } from '../../src/services/circuitBreaker.service';
import { HTTP_STATUS } from '../../src/common/constants';
import { randomUUID } from 'crypto';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
// Helper to create a mock Request with correct params type
const mockRequest = (
  params: ParamsDictionary = {},
  user: { userId: string } = { userId: 'test-user-id' }
): Request =>
  ({
    params,
    user,
  }) as unknown as Request;
// Helper to create a mock Response with jest mocks
const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};
const mockNext = jest.fn();

describe('cardsController', () => {
  describe('getDefaultCard', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when a card is found', () => {
      it('returns 200 and card', async () => {
        const card = {
          id: randomUUID(),
          status: 'active',
          displayName: 'Main Card',
          maskedPan: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
          brand: 'visa',
          cardholderName: 'Anna Andersson',
          artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
        };
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockResolvedValue(card);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getDefaultCard(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
        expect(res.json).toHaveBeenCalledWith(card);
      });
    });

    describe('when no card is found', () => {
      it('returns 404', async () => {
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockResolvedValue(null);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getDefaultCard(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
        expect(res.json).toHaveBeenCalled();
        // @ts-expect-error: mock property is added by jest
        const errorPayload = res.json.mock.calls[0][0];
        expect(errorPayload.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(errorPayload.code).toBe('default_card_not_found');
      });
    });

    describe('when circuit breaker is open', () => {
      it('returns 503', async () => {
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockImplementation(() => {
          throw new DbCircuitOpenError();
        });
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getDefaultCard(req, res, mockNext);

        // @ts-expect-error: mock property is added by jest
        expect(res.json.mock.calls[0][0].status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        // @ts-expect-error: mock property is added by jest
        expect(res.json.mock.calls[0][0].code).toBe('service_unavailable');
      });
    });

    describe('when an unexpected error occurs', () => {
      it('calls next(err)', async () => {
        const error = new Error('unexpected');
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockRejectedValue(error);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getDefaultCard(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
      });
    });
  });
});
