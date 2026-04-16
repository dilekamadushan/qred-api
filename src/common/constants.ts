import type { DbCircuitBreakerOptions } from './types/types';

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
// Common HTTP response status codes

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  CIRCUIT_BREAKER_OPEN_CODE: 'database_circuit_breaker_open',
  OPEN_API_VALIDATION_ERROR: 'format.openapi.validation',
  VALIDATION_ERROR: 'validation_error',
  INTERNAL_SERVER_ERROR: 'internal_server_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  RATE_LIMITED: 'rate_limited',
} as const;

export const DEFAULT_PAGE_SIZE = 10;

export const CARD_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  UNBLOCKED: 'unblocked',
  PENDING_ACTIVATION: 'pending_activation',
  CLOSED: 'closed',
} as const;

export const defaultCircuitBreakerOptions: Required<DbCircuitBreakerOptions> = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000,
  volumeThreshold: 5,
};

export const DASHBOARD_SECTION_TIMEOUT_MS = 1200;

export const CARD_SUMMARY_ATTRIBUTES = [
  'id',
  'status',
  'displayName',
  'maskedPan',
  'brand',
  'cardholderName',
  'artworkUrl',
] as const;
