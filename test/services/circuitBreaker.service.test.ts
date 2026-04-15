import * as LogUtils from '../../src/common/utils/logUtils';
import { createDbCircuitBreaker } from '../../src/services/circuitBreaker.service';
import { DbCircuitOpenError } from '../../src/common/errors/appHttpError';

describe('circuitBreaker.service', () => {
  let logWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    logWarnSpy = jest.spyOn(LogUtils, 'logWarn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDbCircuitBreaker', () => {
    describe('when failures exceed threshold', () => {
      it('opens the circuit after repeated failures', async () => {
        const circuitBreaker = createDbCircuitBreaker(
          async () => {
            throw new Error('database offline');
          },
          {
            timeout: 100,
            errorThresholdPercentage: 1,
            resetTimeout: 1000,
            volumeThreshold: 2,
          }
        );

        await expect(circuitBreaker.execute()).rejects.toThrow('database offline');
        await expect(circuitBreaker.execute()).rejects.toBeInstanceOf(DbCircuitOpenError);
        expect(logWarnSpy).toHaveBeenCalledTimes(1);
        expect(logWarnSpy).toHaveBeenNthCalledWith(
          1,
          'DbCircuitBreaker',
          'Circuit breaker is OPEN (DbCircuitOpenError thrown)'
        );
      });
    });

    describe('when circuit is reset', () => {
      it('allows healthy calls after reset', async () => {
        const circuitBreaker = createDbCircuitBreaker(
          async () => {
            throw new Error('database offline');
          },
          {
            timeout: 100,
            errorThresholdPercentage: 1,
            resetTimeout: 1000,
            volumeThreshold: 2,
          }
        );

        await circuitBreaker.execute().catch(() => undefined);
        await circuitBreaker.execute().catch(() => undefined);
        await circuitBreaker.reset();

        const healthyCircuitBreaker = createDbCircuitBreaker(async () => 'healthy');
        await expect(healthyCircuitBreaker.execute()).resolves.toBe('healthy');
      });
    });
  });
});
