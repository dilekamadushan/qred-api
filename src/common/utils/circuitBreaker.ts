export const isOpenCircuitError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes('breaker is open');
