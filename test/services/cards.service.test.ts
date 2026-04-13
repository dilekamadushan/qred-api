import { Card } from '../../src/db/models/card';
import * as CardService from '../../src/services/cards.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { randomUUID } from 'crypto';
import { DbCircuitOpenError, InternalServerError } from '../../src/common/errors/appHttpError';

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
  let logWarnSpy: jest.SpyInstance;
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logWarnSpy = jest.spyOn(LogUtils, 'logWarn').mockImplementation(() => {});
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
      it('returns null and logs warn', async () => {
        (Card.findOne as jest.Mock).mockResolvedValueOnce(null);
        const result = await CardService.getDefaultCardForCompany('cmp_123', 'user_123');

        expect(result).toBeNull();
        expect(logWarnSpy).toHaveBeenCalledWith(
          'CardService',
          expect.stringContaining('No default card found')
        );
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

    describe('when circuit breaker is open', () => {
      it('logs warn and throws the circuit breaker error', async () => {
        const circuitBreakerError = new DbCircuitOpenError();
        jest
          .spyOn(CardService.defaultCardCircuitBreaker, 'execute')
          .mockRejectedValueOnce(circuitBreakerError);

        await expect(
          CardService.getDefaultCardForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
        expect(logWarnSpy).toHaveBeenCalledWith(
          'CardService',
          expect.stringContaining('Circuit breaker is OPEN for companyId: cmp_123')
        );
      });

      it('throws InternalServerError for non-circuit-breaker errors', async () => {
        const dbError = new Error('db error');
        jest.spyOn(CardService.defaultCardCircuitBreaker, 'execute').mockRejectedValueOnce(dbError);

        await expect(
          CardService.getDefaultCardForCompany('cmp_123', 'user_123')
        ).rejects.toBeInstanceOf(InternalServerError);
      });
    });
  });
});
