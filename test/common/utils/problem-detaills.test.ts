import type { Request, Response } from 'express';
import type { ProblemDetails } from '../../../src/common/types/types';
import {
  createProblemDetails,
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../../../src/common/utils/problemDetails';

describe('utils/problem-details', () => {
  describe('createProblemDetails', () => {
    it('should create a ProblemDetails object with request', () => {
      const req = { originalUrl: '/test/url' } as Request;
      const details = createProblemDetails({
        request: req,
        status: 400,
        title: 'Bad Request',
        detail: 'Invalid input',
        code: 'bad_request',
        errors: [{ field: 'name', reason: 'Required' }],
      });

      expect(details).toMatchObject({
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid input',
        code: 'bad_request',
        errors: [{ field: 'name', reason: 'Required' }],
        instance: expect.stringContaining('/test/url'),
        type: expect.stringContaining('bad_request'),
        requestId: expect.any(String),
      });
    });
  });

  describe('createProblemDetailsWithoutRequest', () => {
    it('should create a ProblemDetails object without request', () => {
      const details = createProblemDetailsWithoutRequest({
        status: 404,
        title: 'Not Found',
        detail: 'Resource not found',
        code: 'not_found',
        instance: '/custom/instance',
        errors: null,
      });

      expect(details).toMatchObject({
        title: 'Not Found',
        status: 404,
        detail: 'Resource not found',
        code: 'not_found',
        errors: null,
        instance: '/custom/instance',
        type: expect.stringContaining('not_found'),
        requestId: expect.any(String),
      });
    });
  });

  describe('sendProblemDetails', () => {
    it('should set headers and send problem details as JSON', () => {
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const problem: ProblemDetails = {
        type: 'type',
        title: 'title',
        status: 500,
        detail: 'detail',
        instance: '/instance',
        requestId: 'reqid',
        code: 'code',
        errors: null,
      };
      const headers = { 'X-Test': 'value' };
      sendProblemDetails(res, problem, headers);

      expect(res.setHeader).toHaveBeenCalledWith('X-Test', 'value');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.type).toHaveBeenCalledWith('application/problem+json');
      expect(res.json).toHaveBeenCalledWith(problem);
    });
  });
});
