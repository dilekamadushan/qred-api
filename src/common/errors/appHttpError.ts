import type { InvalidField } from '../types/types';
import { ERROR_CODES, HTTP_STATUS } from '../constants';

type AppErrorOptions = {
  status: number;
  title: string;
  detail: string;
  code: string;
  errors?: InvalidField[] | null;
};

abstract class BaseAppError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly code: string;
  readonly errors: InvalidField[] | null;

  constructor({
    name,
    status,
    title,
    detail,
    code,
    errors = null,
  }: { name: string } & AppErrorOptions) {
    super(detail);
    this.name = name;
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.code = code;
    this.errors = errors;
  }
}

export class AppHttpError extends BaseAppError {
  constructor({ status, title, detail, code, errors = null }: AppErrorOptions) {
    super({
      name: 'AppHttpError',
      status,
      title,
      detail,
      code,
      errors,
    });
  }
}

export class NotFoundError extends AppHttpError {
  constructor({
    detail,
    code = ERROR_CODES.NOT_FOUND,
    title = ERROR_CODES.NOT_FOUND,
    errors = null,
  }: {
    detail: string;
    code?: string;
    title?: string;
    errors?: InvalidField[] | null;
  }) {
    super({
      status: HTTP_STATUS.NOT_FOUND,
      title,
      detail,
      code,
      errors,
    });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppHttpError {
  constructor({
    detail,
    code = ERROR_CODES.UNAUTHORIZED,
    title = ERROR_CODES.UNAUTHORIZED,
    errors = null,
  }: {
    detail: string;
    code?: string;
    title?: string;
    errors?: InvalidField[] | null;
  }) {
    super({
      status: HTTP_STATUS.UNAUTHORIZED,
      title,
      detail,
      code,
      errors,
    });
    this.name = 'UnauthorizedError';
  }
}

// Generic 409 Conflict error for business rule/resource state violations
export class ResourceConflictError extends AppHttpError {
  constructor(detail: string) {
    super({
      status: 409,
      title: 'conflict',
      detail,
      code: 'conflict',
    });
  }
}

export class RateLimitedError extends AppHttpError {
  readonly retryAfterSeconds: number;

  constructor({
    detail,
    retryAfterSeconds,
    code = ERROR_CODES.RATE_LIMITED,
    title = ERROR_CODES.RATE_LIMITED,
    errors = null,
  }: {
    detail: string;
    retryAfterSeconds: number;
    code?: string;
    title?: string;
    errors?: InvalidField[] | null;
  }) {
    super({
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      title,
      detail,
      code,
      errors,
    });
    this.name = 'RateLimitedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends AppHttpError {
  constructor({
    detail,
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    title = ERROR_CODES.INTERNAL_SERVER_ERROR,
    errors = null,
  }: {
    detail: string;
    code?: string;
    title?: string;
    errors?: InvalidField[] | null;
  }) {
    super({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      title,
      detail,
      code,
      errors,
    });
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends AppHttpError {
  constructor({
    detail,
    code = ERROR_CODES.SERVICE_UNAVAILABLE,
    title = ERROR_CODES.SERVICE_UNAVAILABLE,
    errors = null,
  }: {
    detail: string;
    code?: string;
    title?: string;
    errors?: InvalidField[] | null;
  }) {
    super({
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      title,
      detail,
      code,
      errors,
    });
    this.name = 'ServiceUnavailableError';
  }
}

export class DbCircuitOpenError extends ServiceUnavailableError {
  constructor() {
    super({
      detail: ERROR_CODES.CIRCUIT_BREAKER_OPEN_CODE,
    });
    this.name = 'DbCircuitOpenError';
  }
}

export { BaseAppError };
