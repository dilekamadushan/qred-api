import {
  DbCircuitOpenError,
  createDbCircuitBreaker,
} from '../../src/services/circuitBreaker.service';

describe('circuitBreaker.service', () => {
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

        try {
          await circuitBreaker.execute();
        } catch {
          // ignore
        }
        try {
          await circuitBreaker.execute();
        } catch {
          // ignore
        }
        await circuitBreaker.reset();

        const healthyCircuitBreaker = createDbCircuitBreaker(async () => 'healthy');
        await expect(healthyCircuitBreaker.execute()).resolves.toBe('healthy');
      });
    });
  });
});
