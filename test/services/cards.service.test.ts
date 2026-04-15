import { Op } from 'sequelize';
import { Card } from '../../src/db/models/card';
import * as CardService from '../../src/services/cards.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { randomUUID } from 'crypto';
import {
  DbCircuitOpenError,
  InternalServerError,
  NotFoundError,
} from '../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';

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

describe('CardService', () => {
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(LogUtils, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});
