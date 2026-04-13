import CircuitBreaker from 'opossum';
import { DbCircuitOpenError } from '../common/errors/appHttpError';

export type DbCircuitBreakerOptions = {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
};

const defaultOptions: Required<DbCircuitBreakerOptions> = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000,
  volumeThreshold: 5,
};

function isOpenCircuitError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('breaker is open');
}

export function createDbCircuitBreaker<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: DbCircuitBreakerOptions
) {
  let circuitBreakerOptions = { ...defaultOptions, ...options };
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

const sharedBreakerInternal = createDbCircuitBreaker(
  async (action: () => Promise<unknown>) => action(),
  {
    timeout: 2500,
    errorThresholdPercentage: 50,
    resetTimeout: 5000,
    volumeThreshold: 2,
  }
);

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
