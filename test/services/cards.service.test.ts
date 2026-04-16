import { Op } from 'sequelize';
import { Card } from '../../src/db/models/card';
import { sequelize } from '../../src/db/sequelize';
import * as CardService from '../../src/services/cards.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { randomUUID } from 'crypto';
import {
  DbCircuitOpenError,
  InternalServerError,
  NotFoundError,
} from '../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';

jest.mock('../../src/db/sequelize', () => ({
  __esModule: true,
  sequelize: {
    transaction: jest.fn(),
  },
}));
jest.mock('../../src/db/models/card');

function createMockCard(overrides = {}) {
  return {
    id: randomUUID(),
    status: 'active',
    displayName: 'Main Card',
    maskedPan: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
    brand: 'visa',
    cardholderName: 'Anna Andersson',
    artworkUrl: `https://cdn.qred.example.com/card-artwork/visa.png`,
    ...overrides,
  };
}

function createMockCardInstance(overrides: Partial<Record<string, unknown>> = {}) {
  const card: {
    id: string;
    companyId: string;
    userId: string;
    status: string;
    displayName: string;
    maskedPan: string;
    brand: string;
    cardholderName: string;
    artworkUrl: string;
    activatedAt: Date | null;
    blockedAt: Date | null;
    update: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
    [key: string]: unknown;
  } = {
    id: randomUUID(),
    companyId: 'cmp_123',
    userId: 'user_123',
    status: 'active',
    displayName: 'Main Card',
    maskedPan: '**** **** **** 1234',
    brand: 'visa',
    cardholderName: 'Anna Andersson',
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
    activatedAt: null,
    blockedAt: null,
    update: jest.fn(async function update(values: Record<string, unknown>): Promise<unknown> {
      Object.assign(card, values);
      return card;
    }),
    ...overrides,
  };

  return card;
}

describe('CardService', () => {
  let logErrorSpy: jest.SpyInstance;
  let transactionMock: { commit: jest.Mock; rollback: jest.Mock; LOCK: { UPDATE: string } };

  beforeEach(async () => {
    (Card.findOne as jest.Mock).mockReset();
    (Card.update as jest.Mock).mockReset();
    logErrorSpy = jest.spyOn(LogUtils, 'logError').mockImplementation(() => {});
    transactionMock = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      LOCK: {
        UPDATE: 'UPDATE',
      },
    };
    (sequelize.transaction as jest.Mock).mockResolvedValue(transactionMock);
    await sharedDbCircuitBreaker.reset();
    await sharedDbCircuitBreaker.updateOptions({
      timeout: 2500,
      errorThresholdPercentage: 100,
      resetTimeout: 5000,
      volumeThreshold: 1000,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await sharedDbCircuitBreaker.reset();
  });

  describe('getDefaultCardForCompany', () => {
    describe('when a default card exists', () => {
      it('returns the default card and logs info', async () => {
        const mockCard = createMockCard();
        (Card.findOne as jest.Mock).mockResolvedValueOnce(mockCard);
        const result = await CardService.getDefaultCardForCompany('cmp_123', 'user_123');

        expect(result).toEqual(mockCard);
      });
    });

    describe('when no default card exists', () => {
      it('falls back to the next available card using default-first ordering', async () => {
        const fallbackCard = createMockCard({ isDefault: false, displayName: 'Backup Card' });
        (Card.findOne as jest.Mock).mockResolvedValueOnce(fallbackCard);

        const result = await CardService.getDefaultCardForCompany('cmp_123', 'user_123');

        expect(result).toEqual(fallbackCard);
        expect(Card.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              companyId: 'cmp_123',
              userId: 'user_123',
              status: { [Op.not]: 'closed' },
            }),
            order: [
              ['isDefault', 'DESC'],
              ['createdAt', 'DESC'],
            ],
          })
        );
      });

      it('throws NotFoundError and logs warn when no card exists at all', async () => {
        (Card.findOne as jest.Mock).mockResolvedValueOnce(null);

        await expect(
          CardService.getDefaultCardForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    describe('when a DB error occurs', () => {
      it('logs error and throws the error', async () => {
        (Card.findOne as jest.Mock).mockRejectedValueOnce(new Error('db error'));

        await expect(
          CardService.getDefaultCardForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(InternalServerError);

        expect(logErrorSpy).toHaveBeenCalledWith(
          'CardService',
          expect.stringContaining('Error querying default card'),
          expect.any(Error)
        );
      });
    });

    describe('when circuit breaker execution fails', () => {
      it('rethrows DbCircuitOpenError', async () => {
        const circuitBreakerError = new DbCircuitOpenError();
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(circuitBreakerError);

        await expect(
          CardService.getDefaultCardForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
      });

      it('propagates non-circuit-breaker errors', async () => {
        const dbError = new Error('db error');
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(dbError);

        await expect(CardService.getDefaultCardForCompany('cmp_123', 'user_123')).rejects.toThrow(
          'db error'
        );
      });
    });
  });

  describe('blockCardForCompany', () => {
    it('blocks an active card', async () => {
      const card = createMockCardInstance({ status: 'active' });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      const result = await CardService.blockCardForCompany('cmp_123', 'card_123', 'user_123');

      expect(card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'blocked',
          blockedAt: expect.any(Date),
        }),
        expect.objectContaining({
          transaction: transactionMock,
        })
      );
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(transactionMock.rollback).not.toHaveBeenCalled();
      expect(result.status).toBe('blocked');
    });

    it('throws NotFoundError when card does not exist', async () => {
      (Card.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        CardService.blockCardForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
    });

    it('throws conflict when card status is not active', async () => {
      const card = createMockCardInstance({ status: 'blocked' });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      await expect(
        CardService.blockCardForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toMatchObject({ status: 409, code: 'conflict' });

      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCardByIdForCompany', () => {
    it('returns the requested card when it exists in scope', async () => {
      const card = createMockCardInstance({
        id: 'card_123',
        companyId: 'cmp_123',
        userId: 'user_123',
      });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      const result = await CardService.getCardByIdForCompany('cmp_123', 'card_123', 'user_123');

      expect(Card.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'card_123',
            companyId: 'cmp_123',
            userId: 'user_123',
          },
        })
      );
      expect(result.id).toBe(card.id);
    });

    it('throws NotFoundError when card does not exist', async () => {
      (Card.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        CardService.getCardByIdForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws InternalServerError for database failures', async () => {
      (Card.findOne as jest.Mock).mockRejectedValueOnce(new Error('db error'));

      await expect(
        CardService.getCardByIdForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toBeInstanceOf(InternalServerError);

      expect(logErrorSpy).toHaveBeenCalledWith(
        'CardService',
        expect.stringContaining('Error querying card card_123'),
        expect.any(Error)
      );
    });
  });

  describe('unblockCardForCompany', () => {
    it('unblocks a blocked card', async () => {
      // mock Date
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const card = createMockCardInstance({ status: 'blocked', blockedAt: new Date() });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      const result = await CardService.unblockCardForCompany('cmp_123', 'card_123', 'user_123');

      expect(card.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', blockedAt: null }),
        expect.objectContaining({
          transaction: transactionMock,
        })
      );
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('active');
    });

    it('throws conflict when card status is not blocked', async () => {
      const card = createMockCardInstance({ status: 'active' });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      await expect(
        CardService.unblockCardForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toMatchObject({ status: 409, code: 'conflict' });

      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('activateCardForCompany', () => {
    it('activates a pending activation card', async () => {
      const card = createMockCardInstance({ status: 'pending_activation' });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      const result = await CardService.activateCardForCompany('cmp_123', 'card_123', 'user_123');

      expect(card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          activatedAt: expect.any(Date),
          blockedAt: null,
        }),
        expect.objectContaining({
          transaction: transactionMock,
        })
      );
      expect(result.cardId).toBe('card_123');
      expect(result.status).toBe('active');
      expect(new Date(result.activatedAt).toISOString()).toBe(result.activatedAt);
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
    });

    it('throws conflict when card is not pending activation', async () => {
      const card = createMockCardInstance({ status: 'active' });
      (Card.findOne as jest.Mock).mockResolvedValueOnce(card);

      await expect(
        CardService.activateCardForCompany('cmp_123', 'card_123', 'user_123')
      ).rejects.toMatchObject({ status: 409, code: 'conflict' });

      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
    });
  });
});
