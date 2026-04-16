import type { NextFunction, Request, Response } from 'express';
import { logInfo } from '../common/utils/logUtils';
import { runWithRequestContext } from '../common/requestContext';
import { randomUUID } from 'crypto';

// Logs every request with method,requestId, url, status, and duration
export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const requestId = randomUUID();
  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  runWithRequestContext({ requestId }, () => {
    const startTime = Date.now();

    response.on('finish', () => {
      const duration = Date.now() - startTime;

      logInfo(
        'Request',
        `${request.method} ${request.originalUrl} - ${response.statusCode} (${duration}ms)`
      );
    });

    next();
  });
}
