import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../common/errors/appHttpError';
import { ERROR_CODES } from '../common/constants';

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_LIMIT = 10;
const DEFAULT_ERROR_MESSAGE = 'Too many requests. Please retry later.';

export function createRateLimiter(
  options: {
    windowMs?: number;
    limit?: number;
    errorMessage?: string;
    errorCode?: string;
  } = {}
) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    limit = DEFAULT_LIMIT,
    errorMessage = DEFAULT_ERROR_MESSAGE,
    errorCode = ERROR_CODES.RATE_LIMITED,
  } = options;

  return rateLimit({
    windowMs,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request) => request.get('authorization') ?? ipKeyGenerator(request.ip ?? ''),
    handler: (_request, _response, next) => {
      next(
        new RateLimitedError({
          detail: errorMessage,
          code: errorCode,
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        })
      );
    },
  });
}

export const sharedRateLimiter = createRateLimiter();
