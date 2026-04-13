// Simple logger utility for consistent logging across the codebase

export function logInfo(context: string, message: string, ...args: unknown[]) {
  // if test mode don't log anything
  if (process.env.NODE_ENV === 'test') return;

  // eslint-disable-next-line no-console
  console.info(`[INFO] [${context}]`, message, ...args);
}

export function logWarn(context: string, message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.warn(`[WARN] [${context}]`, message, ...args);
}

export function logError(context: string, message: string, ...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] [${context}]`, message, ...args);
}
