import {
  mapValidationErrors,
  sendAuthProblem,
  sendProblem,
  sendTypedAppError,
} from '../../../src/common/utils/error';
import { ERROR_CODES, HTTP_STATUS } from '../../../src/common/constants';
import { BaseAppError, RateLimitedError } from '../../../src/common/errors/appHttpError';
import type { Request, Response } from 'express';

describe('errorUtils', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { originalUrl: '/test/url' };
    res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
  });

  describe('sendProblem', () => {
    it('should send a problem details response', () => {
      sendProblem({
        response: res as Response,
        request: req as Request,
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid input',
        code: 'BAD_REQUEST',
        errors: null,
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.type).toHaveBeenCalledWith('application/problem+json');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bad Request',
          detail: 'Invalid input',
          code: 'BAD_REQUEST',
          instance: expect.stringContaining('/test/url'),
        })
      );
    });
  });

  describe('mapValidationErrors', () => {
    it('should map OpenAPI errors to InvalidField[]', () => {
      const errors = [
        { path: 'field1', message: 'is required' },
        { path: 'field2', message: 'must be a string' },
      ];
      const result = mapValidationErrors(errors);
      expect(result).toEqual([
        { field: 'field1', reason: 'is required' },
        { field: 'field2', reason: 'must be a string' },
      ]);
    });
    it('should return null if errors is not an array', () => {
      // @ts-expect-error test invalid input
      expect(mapValidationErrors(undefined)).toBeNull();
    });
    it('should handle unknown error shapes', () => {
      // @ts-expect-error test invalid input
      const result = mapValidationErrors([{}]);
      expect(result).toEqual([{ field: 'unknown', reason: 'unknown reason.' }]);
    });
  });

  describe('sendTypedAppError', () => {
    it('should send a typed app error', () => {
      class MyError extends BaseAppError {
        constructor() {
          super({
            name: 'MyError',
            status: 404,
            title: 'Not Found',
            detail: 'Not found',
            code: 'NOT_FOUND',
          });
        }
      }
      const error = new MyError();
      sendTypedAppError(res as Response, req as Request, error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Not Found',
          detail: 'Not found',
          code: 'NOT_FOUND',
        })
      );
    });
    it('should set Retry-After header for RateLimitedError', () => {
      const error = new RateLimitedError({
        detail: 'Too many requests',
        code: 'rate_limited',
        retryAfterSeconds: 42,
      });
      sendTypedAppError(res as Response, req as Request, error);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    });
  });

  describe('sendAuthProblem', () => {
    it('should send UNAUTHORIZED problem', () => {
      sendAuthProblem(res as Response, req as Request, HTTP_STATUS.UNAUTHORIZED, 'No token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.UNAUTHORIZED,
          detail: 'No token',
        })
      );
    });
    it('should send FORBIDDEN problem', () => {
      sendAuthProblem(res as Response, req as Request, HTTP_STATUS.FORBIDDEN, 'No access');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.FORBIDDEN,
          detail: 'No access',
        })
      );
    });
  });
});
