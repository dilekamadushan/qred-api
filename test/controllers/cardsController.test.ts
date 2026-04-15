import { getDefaultCard } from '../../src/controllers/cards.controller';
import * as CardService from '../../src/services/cards.service';
import { DbCircuitOpenError, NotFoundError } from '../../src/common/errors/appHttpError';
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

describe('cardsController', () => {
  describe('getDefaultCard', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when a card is found', () => {
      it('returns 200 and card', async () => {
        const card = {
          id: randomUUID(),
          status: 'active' as const,
          displayName: 'Main Card',
          maskedPan: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
          brand: 'visa' as const,
          cardholderName: 'Anna Andersson',
          artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
        };
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockResolvedValue(card);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await getDefaultCard(req, res);

        expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
        expect(res.json).toHaveBeenCalledWith(card);
      });
    });

    describe('when no card is found', () => {
      it('throws a 404 app error', async () => {
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockRejectedValue(
          new NotFoundError({
            detail: 'No default card exists for company cmp_123.',
            code: 'default_card_not_found',
            title: 'default_card_not_found',
          })
        );
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getDefaultCard(req, res)).rejects.toMatchObject({
          status: HTTP_STATUS.NOT_FOUND,
          code: 'default_card_not_found',
        });
      });
    });

    describe('when circuit breaker is open', () => {
      it('propagates the error to middleware', async () => {
        jest
          .spyOn(CardService, 'getDefaultCardForCompany')
          .mockRejectedValue(new DbCircuitOpenError());
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getDefaultCard(req, res)).rejects.toBeInstanceOf(DbCircuitOpenError);
      });
    });

    describe('when an unexpected error occurs', () => {
      it('propagates the error to middleware', async () => {
        const error = new Error('unexpected');
        jest.spyOn(CardService, 'getDefaultCardForCompany').mockRejectedValue(error);
        const req = mockRequest({ companyId: 'cmp_123' });
        const res = mockResponse();

        await expect(getDefaultCard(req, res)).rejects.toThrow('unexpected');
      });
    });
  });
});
