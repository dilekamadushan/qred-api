import { type NextFunction, type Request, type Response } from 'express';
import {
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../common/utils/problem-details';
import { HTTP_STATUS } from '../common/constants';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';

export function errorHandler(error: HttpError, req: Request, res: Response, _next: NextFunction) {
  const status = error.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errors = Array.isArray(error.errors)
    ? error.errors.map((item) => {
        if (typeof item === 'object' && item !== null) {
          const errorItem = item as { path?: string; message?: string };
          return {
            field: errorItem.path ?? 'unknown',
            reason: errorItem.message ?? 'Invalid value.',
          };
        }
        return {
          field: 'unknown',
          reason: 'Invalid value.',
        };
      })
    : null;

  sendProblemDetails(
    res,
    createProblemDetailsWithoutRequest({
      status,
      title: status === HTTP_STATUS.BAD_REQUEST ? 'Validation error' : 'Internal server error',
      detail: error.message,
      code: status === HTTP_STATUS.BAD_REQUEST ? 'validation_error' : 'internal_server_error',
      instance: `https://api.qred.example.com${req.originalUrl}`,
      errors,
    })
  );
}
