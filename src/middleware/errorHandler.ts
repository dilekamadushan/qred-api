import { type NextFunction, type Request, type Response } from 'express';
import { ERROR_CODES, HTTP_STATUS } from '../common/constants';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import { BaseAppError } from '../common/errors/appHttpError';
import {
  mapValidationErrors,
  sendAuthProblem,
  sendProblem,
  sendTypedAppError,
} from '../common/utils/error';
import { logError } from '../common/utils/logUtils';

export function errorHandler(
  error: HttpError,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  // Only log unexpected or server errors (5xx)
  const errorStatus = error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (errorStatus >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logError('Request', `${request.method} ${request.originalUrl} - ${errorStatus}`, error);
  }

  if (error instanceof BaseAppError) return sendTypedAppError(response, request, error);

  if (errorStatus === HTTP_STATUS.BAD_REQUEST)
    return sendProblem({
      response: response,
      request: request,
      status: HTTP_STATUS.BAD_REQUEST,
      title: 'VALIDATION_ERROR',
      detail: error.message,
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: mapValidationErrors(error.errors),
    });

  if (errorStatus === HTTP_STATUS.UNAUTHORIZED || errorStatus === HTTP_STATUS.FORBIDDEN)
    return sendAuthProblem(response, request, errorStatus, error.message);

  return sendProblem({
    response: response,
    request: request,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    title: 'INTERNAL_SERVER_ERROR',
    detail: error.message,
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    errors: null,
  });
}
