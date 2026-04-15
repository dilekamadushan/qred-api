import { DASHBOARD_SECTION_TIMEOUT_MS } from '../constants';
import { InternalServerError } from '../errors/appHttpError';
import { logWarn } from './logUtils';

const SLOW_OPERATION_LOG_THRESHOLD_RATIO = 0.8;

/**
 * Runs a promise with a timeout. If the promise does not resolve within the timeout, rejects with an error.
 */
export async function withSlaTimeout<T>(
  operation: Promise<T>,
  operationName = 'async operation',
  timeoutMs = DASHBOARD_SECTION_TIMEOUT_MS
): Promise<T> {
  const startedAt = Date.now();
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      const durationMs = Date.now() - startedAt;
      logWarn('AsyncUtils', `${operationName} exceeded SLA timeout`, {
        durationMs,
        timeoutMs,
      });
      reject(
        new InternalServerError({
          detail: `${operationName} exceeded SLA timeout of ${timeoutMs}ms`,
        })
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation, timeoutPromise]);
    const durationMs = Date.now() - startedAt;

    if (durationMs >= timeoutMs * SLOW_OPERATION_LOG_THRESHOLD_RATIO) {
      logWarn('AsyncUtils', `${operationName} is getting slow`, {
        durationMs,
        timeoutMs,
      });
    }

    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
