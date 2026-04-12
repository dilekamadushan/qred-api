import type { NextFunction, Request, Response } from 'express';
import { logError } from '../common/utils/logUtils';
import { ERROR_CODES } from '../common/constants';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';

// Middleware to log OpenAPI validator errors
export function openApiErrorLogger(
  error: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    error.status === 500 &&
    error.errors &&
    error.errors[0]?.errorCode === ERROR_CODES.OPEN_API_VALIDATION_ERROR
  ) {
    logError('OpenAPI', 'Validation error', error.errors, error.message);
  }
  next(error);
}
