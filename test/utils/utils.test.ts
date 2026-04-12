import { buildTransactionQueryOptions } from '../../src/common/utils/transactions';
import {
  buildPaginationLinks,
  decodeCursor,
  encodeCursor,
} from '../../src/common/utils/pagination';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '../../src/common/types/types';
import {
  createProblemDetails,
  createProblemDetailsWithoutRequest,
  sendProblemDetails,
} from '../../src/common/utils/problemDetails';

describe('utils/transactions', () => {
  describe('buildTransactionQueryOptions', () => {
    it('should parse all query options correctly', () => {
      const query = {
        cursor: 'abc',
        status: 'booked',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        pageSize: '25',
        sortBy: 'amount',
        sortOrder: 'asc',
        search: 'coffee',
      };
      const result = buildTransactionQueryOptions(query);

      expect(result).toEqual({
        cursor: 'abc',
        status: 'booked',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30',
        pageSize: 25,
        sortBy: 'amount',
        sortOrder: 'asc',
        search: 'coffee',
      });
    });

    it('should default pageSize to 10 if not provided or invalid', () => {
      expect(buildTransactionQueryOptions({}).pageSize).toBe(10);
      expect(buildTransactionQueryOptions({ pageSize: 'foo' }).pageSize).toBe(10);
    });
  });
});

describe('utils/pagination', () => {
  describe('encodeCursor', () => {
    it('should encode an object to a base64 string', () => {
      const obj = { createdAt: '2026-04-12', id: '123' };
      const encoded = encodeCursor(obj);

      expect(typeof encoded).toBe('string');
      expect(() => JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))).not.toThrow();
      expect(JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))).toEqual(obj);
    });
  });

  describe('decodeCursor', () => {
    it('should decode a valid base64 string to an object', () => {
      const obj = { createdAt: '2026-04-12', id: '123' };
      const encoded = Buffer.from(JSON.stringify(obj)).toString('base64');
      const decoded = decodeCursor<typeof obj>(encoded);

      expect(decoded).toEqual(obj);
    });

    it('should return null for invalid base64', () => {
      expect(decodeCursor('not-base64')).toBeNull();
    });
  });
  // Duplicate buildPaginationLinks describe block removed
});

describe('utils/problem-details', () => {
  describe('createProblemDetails', () => {
    it('should create a ProblemDetails object with request', () => {
      const req = { originalUrl: '/test/url' } as Request;
      const details = createProblemDetails({
        req,
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
describe('buildPaginationLinks', () => {
  function mockRequest(url: string): Request {
    return {
      protocol: 'http',
      get: () => 'localhost:3000',
      originalUrl: url,
    } as unknown as Request;
  }

  it('should build self and next links when hasMore and nextCursor', () => {
    const req = mockRequest('/api/v1/companies/cmp_123/transactions?pageSize=10');
    const page = { pageSize: 10, hasMore: true, nextCursor: 'abc' };
    const { self, next } = buildPaginationLinks(req, page);

    expect(self).toContain('/api/v1/companies/cmp_123/transactions');
    expect(next).toContain('cursor=abc');
    expect(next).toContain('pageSize=10');
  });

  it('should set next to null if no more pages', () => {
    const req = mockRequest('/api/v1/companies/cmp_123/transactions');
    const page = { pageSize: 10, hasMore: false };
    const { next } = buildPaginationLinks(
      req,
      page as { pageSize: number; hasMore: boolean; nextCursor?: string | null }
    );

    expect(next).toBeNull();
  });
});
