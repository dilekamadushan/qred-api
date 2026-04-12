import type { NextFunction, Request, Response } from 'express';
import { logError, logInfo } from '../common/utils/logUtils';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';

// Logs every request with method, url, status, and duration
export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const start = Date.now();
  response.on('finish', () => {
    const duration = Date.now() - start;
    logInfo(
      'Request',
      `${request.method} ${request.originalUrl} - ${response.statusCode} (${duration}ms)`
    );
  });
  next();
}

// Logs errors with request details
export function errorLogger(error: HttpError, request: Request, _: Response, next: NextFunction) {
  logError('Request', `${request.method} ${request.originalUrl} - ${error.status || 500}`, error);
  next(error);
}
