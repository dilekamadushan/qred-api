// Simple logger utility for consistent logging across the codebase

import { getRequestContext } from '../requestContext';

const getRequestIdForLogging = (): string => {
  const requestId = getRequestContext()?.requestId;
  return requestId ? `requestId=${requestId}` : '';
};

export function logInfo(context: string, message: string, ...args: unknown[]) {
  // if test mode don't log anything
  if (process.env.NODE_ENV === 'test') return;

  // eslint-disable-next-line no-console
  console.info(`[INFO] [${context}] ${getRequestIdForLogging()}`, message, ...args);
}

export function logWarn(context: string, message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.warn(`[WARN] [${context}] ${getRequestIdForLogging()}`, message, ...args);
}

export function logError(context: string, message: string, ...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] [${context}] ${getRequestIdForLogging()}`, message, ...args);
}
