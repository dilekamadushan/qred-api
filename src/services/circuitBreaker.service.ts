import CircuitBreaker from 'opossum';

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

export class DbCircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';

  constructor() {
    super('Circuit breaker open');
    this.name = 'DbCircuitOpenError';
  }
}

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
