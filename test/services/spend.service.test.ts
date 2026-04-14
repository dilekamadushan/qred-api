import { UserCompanySpend } from '../../src/db/models/user-company-spend';
import * as SpendService from '../../src/services/spend.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { DbCircuitOpenError, InternalServerError } from '../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';

jest.mock('../../src/db/models/user-company-spend');

describe('SpendService', () => {
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(LogUtils, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRemainingSpendForCompany', () => {
    it('returns remaining spend summary for a user and company', async () => {
      (UserCompanySpend.findOne as jest.Mock).mockResolvedValueOnce({
        limitMinor: 500000,
        remainingMinor: 120000,
        currency: 'SEK',
      });

      const result = await SpendService.getRemainingSpendForCompany('user_123', 'cmp_123');

      expect(result).toEqual({
        spent: 380000,
        limit: 500000,
        remaining: 120000,
        utilizationPercent: 76,
        currency: 'SEK',
        label: 'based on your set limit',
      });
    });

    it('returns null when no spend data exists', async () => {
      (UserCompanySpend.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await SpendService.getRemainingSpendForCompany('user_123', 'cmp_123');

      expect(result).toBeNull();
    });

    it('logs and throws when DB fails', async () => {
      (UserCompanySpend.findOne as jest.Mock).mockRejectedValueOnce(new Error('db error'));

      await expect(
        SpendService.getRemainingSpendForCompany('user_123', 'cmp_123')
      ).rejects.toBeInstanceOf(InternalServerError);

      expect(logErrorSpy).toHaveBeenCalledWith(
        'SpendService',
        expect.stringContaining('Error querying spend'),
        expect.any(Error)
      );
    });

    describe('when circuit breaker execution fails', () => {
      it('rethrows DbCircuitOpenError', async () => {
        const error = new DbCircuitOpenError();
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(error);

        await expect(
          SpendService.getRemainingSpendForCompany('user_123', 'cmp_123')
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
      });

      it('propagates non-circuit errors', async () => {
        jest
          .spyOn(sharedDbCircuitBreaker, 'execute')
          .mockRejectedValueOnce(new Error('breaker failure'));

        await expect(
          SpendService.getRemainingSpendForCompany('user_123', 'cmp_123')
        ).rejects.toThrow('breaker failure');
      });
    });
  });
});
