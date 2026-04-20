import CircuitBreaker from 'opossum';
import { DbCircuitOpenError } from '../common/errors/appHttpError';
import type { DbCircuitBreakerOptions } from '../common/types/types';
import { isOpenCircuitError } from '../common/utils/circuitBreaker';
import { defaultCircuitBreakerOptions } from '../common/constants';
import { logWarn } from '../common/utils/logUtils';

export const sharedDbCircuitBreaker = {
  execute<T>(action: () => Promise<T>): Promise<T> {
    return sharedBreakerInternal.execute(action) as Promise<T>;
  },
  async reset() {
    await sharedBreakerInternal.reset();
  },
  async updateOptions(nextOptions: Partial<DbCircuitBreakerOptions>) {
    await sharedBreakerInternal.updateOptions(nextOptions);
  },
};

const sharedBreakerInternal = createDbCircuitBreaker(
  async (action: () => Promise<unknown>) => action(),
  {
    timeout: 2500,
    errorThresholdPercentage: 50,
    resetTimeout: 5000,
    volumeThreshold: 2,
  }
);

export function createDbCircuitBreaker<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: DbCircuitBreakerOptions
) {
  let circuitBreakerOptions = { ...defaultCircuitBreakerOptions, ...options };
  let breaker = createBreaker();

  function createBreaker() {
    return new CircuitBreaker(action, circuitBreakerOptions);
  }

  return {
    async execute(...args: TArgs): Promise<TResult> {
      try {
        return (await breaker.fire(...args)) as TResult;
      } catch (error) {
        if (breaker.opened || isOpenCircuitError(error)) {
          logWarn('DbCircuitBreaker', 'Circuit breaker is OPEN (DbCircuitOpenError thrown)');

          throw new DbCircuitOpenError();
        }

        throw error;
      }
    },
    async reset() {
      breaker.shutdown();
      breaker = createBreaker();
    },
    async updateOptions(nextOptions: Partial<DbCircuitBreakerOptions>) {
      circuitBreakerOptions = { ...circuitBreakerOptions, ...nextOptions };
      await this.reset();
    },
  };
}
