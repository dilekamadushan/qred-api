import { type NextFunction, type Request, type Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import { BaseAppError } from '../common/errors/appHttpError';
import {
  mapValidationErrors,
  sendAuthProblem,
  sendProblem,
  sendTypedAppError,
} from '../common/utils/error';

export function errorHandler(error: HttpError, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof BaseAppError) return sendTypedAppError(res, req, error);

  if (error.status === HTTP_STATUS.BAD_REQUEST)
    return sendProblem({
      response: res,
      request: req,
      status: HTTP_STATUS.BAD_REQUEST,
      title: 'VALIDATION_ERROR',
      detail: error.message,
      code: 'VALIDATION_ERROR',
      errors: mapValidationErrors(error.errors),
    });

  if (error.status === HTTP_STATUS.UNAUTHORIZED || error.status === HTTP_STATUS.FORBIDDEN)
    return sendAuthProblem(res, req, error.status, error.message);

  return sendProblem({
    response: res,
    request: req,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    title: 'INTERNAL_SERVER_ERROR',
    detail: error.message,
    code: 'INTERNAL_SERVER_ERROR',
    errors: null,
  });
}
