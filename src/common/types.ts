// User info attached to req.user by auth middleware
export type User = {
  userId: string;
  [key: string]: unknown;
};
// Common types for reuse across the codebase

export type HttpStatusCode =
  (typeof import('./constants').HTTP_STATUS)[keyof typeof import('./constants').HTTP_STATUS];

export type InvalidField = {
  field: string;
  reason: string;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string | null;
  requestId: string;
  code: string;
  errors: InvalidField[] | null;
};

export interface GenericError {
  code?: string;
  [key: string]: unknown;
}
