import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problem-details';
import { HTTP_STATUS } from '../common/constants';

type DefaultRateLimiterOptions = {
  windowMs?: number;
  limit?: number;
  errorMessage?: string;
  errorCode?: string;
  keyGenerator?: (req: import('express').Request) => string;
};

export function createDefaultRateLimiter(options: DefaultRateLimiterOptions = {}) {
  const {
    windowMs = 60000,
    limit = 10,
    errorMessage = 'Too many requests were made to this endpoint. Please retry later.',
    errorCode = 'rate_limited',
    keyGenerator,
  } = options;
  return rateLimit({
    windowMs: Number(process.env.DEFAULT_RATE_LIMIT_WINDOW_MS ?? windowMs),
    limit: Number(process.env.DEFAULT_RATE_LIMIT_MAX ?? limit),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator:
      keyGenerator || ((req) => req.get('authorization') ?? ipKeyGenerator(req.ip ?? '127.0.0.1')),
    handler: (req, res) => {
      sendProblemDetails(
        res,
        createProblemDetails({
          req,
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          title: 'Too many requests',
          detail: errorMessage,
          code: errorCode,
        }),
        {
          'Retry-After': String(
            Math.ceil(Number(process.env.DEFAULT_RATE_LIMIT_WINDOW_MS ?? windowMs) / 1000)
          ),
        }
      );
    },
  });
}
