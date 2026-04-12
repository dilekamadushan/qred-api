import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problemDetails';
import { HTTP_STATUS } from '../common/constants';

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_LIMIT = 10;
const DEFAULT_ERROR_MESSAGE = 'Too many requests. Please retry later.';
const DEFAULT_ERROR_CODE = 'rate_limited';

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
    errorCode = DEFAULT_ERROR_CODE,
  } = options;

  return rateLimit({
    windowMs,
    max: limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request) => request.get('authorization') ?? ipKeyGenerator(request.ip ?? ''),
    handler: (request, response) => {
      sendProblemDetails(
        response,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          title: 'Too Many Requests',
          detail: errorMessage,
          code: errorCode,
        }),
        {
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        }
      );
    },
  });
}

export const sharedRateLimiter = createRateLimiter();
