import type { Request, Response } from 'express';
import type { HttpError } from 'express-openapi-validator/dist/framework/types';
import { RateLimitedError } from '../errors/appHttpError';
import type { BaseAppError } from '../errors/appHttpError';
import { ERROR_CODES, HTTP_STATUS } from '../constants';
import type { InvalidField } from '../types/types';
import { createProblemDetailsWithoutRequest, sendProblemDetails } from './problemDetails';

type SendProblemInput = {
  response: Response;
  request: Request;
  status: number;
  title: string;
  detail: string;
  code: string;
  errors?: InvalidField[] | null;
  headers?: Record<string, string>;
};

const getInstancePath = (req: Request) => `https://api.qred.example.com${req.originalUrl}`;

export const sendProblem = ({
  response,
  request,
  status,
  title,
  detail,
  code,
  errors = null,
  headers,
}: SendProblemInput): Response => {
  return sendProblemDetails(
    response,
    createProblemDetailsWithoutRequest({
      status,
      title,
      detail,
      code,
      requestId: request.requestId,
      instance: getInstancePath(request),
      errors,
    }),
    headers
  );
};

export const sendAuthProblem = (
  response: Response,
  request: Request,
  status: number,
  message: string
) => {
  const code =
    status === HTTP_STATUS.UNAUTHORIZED ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.FORBIDDEN;

  return sendProblem({
    response,
    request,
    status,
    title: code,
    detail: message,
    code,
    errors: null,
  });
};

export const mapValidationErrors = (errors: HttpError['errors']): InvalidField[] | null => {
  if (!Array.isArray(errors)) {
    return null;
  }

  return errors.map((item) => {
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
  });
};

export const sendTypedAppError = (
  response: Response,
  request: Request,
  error: BaseAppError
): Response => {
  const headers =
    error instanceof RateLimitedError
      ? { 'Retry-After': String(error.retryAfterSeconds) }
      : undefined;

  return sendProblem({
    response,
    request,
    status: error.status,
    title: error.title,
    detail: error.detail,
    code: error.code,
    errors: error.errors,
    headers,
  });
};
