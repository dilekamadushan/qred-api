import { type NextFunction, type Request, type Response } from 'express';
import {
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../common/utils/problemDetails';
import { ERROR_CODES, HTTP_STATUS } from '../common/constants';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';

import { DbCircuitOpenError } from '../services/circuitBreaker.service';

export function errorHandler(error: HttpError, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof DbCircuitOpenError) {
    return sendProblemDetails(
      res,
      createProblemDetailsWithoutRequest({
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        title: 'Service unavailable',
        detail: 'A required backend dependency is temporarily unavailable. Please retry shortly.',
        code: 'service_unavailable',
        instance: `https://api.qred.example.com${req.originalUrl}`,
      })
    );
  }

  const status = error.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errors = Array.isArray(error.errors)
    ? error.errors.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const errorItem = item as { path?: string; message?: string };

          return {
            field: errorItem.path ?? 'unknown',
            reason: errorItem.message ?? 'unknown reason.',
          };
        }

        return {
          field: 'unknown',
          reason: 'Invalid value.',
        };
      })
    : null;

  const errorCode =
    status === HTTP_STATUS.BAD_REQUEST
      ? ERROR_CODES.VALIDATION_ERROR
      : ERROR_CODES.INTERNAL_SERVER_ERROR;

  sendProblemDetails(
    res,
    createProblemDetailsWithoutRequest({
      status,
      title: errorCode,
      detail: error.message,
      code: errorCode,
      instance: `https://api.qred.example.com${req.originalUrl}`,
      errors,
    })
  );
}
