import { decodeCursor, encodeCursor } from '../../../src/common/utils/pagination';

import { buildCursorPage, buildPaginationLinks } from '../../../src/common/utils/pagination';
import type { Request } from 'express';

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

describe('buildCursorPage', () => {
  it('should return pageItems and page metadata with nextCursor when hasMore', () => {
    const rows = [
      { id: 'a', createdAt: '2026-04-10T10:00:00.000Z' },
      { id: 'b', createdAt: '2026-04-09T10:00:00.000Z' },
    ];

    const result = buildCursorPage(rows, 1, (last) => ({
      id: last.id,
      createdAt: last.createdAt,
    }));

    expect(result.pageItems).toHaveLength(1);
    expect(result.page.hasMore).toBe(true);
    expect(result.page.pageSize).toBe(1);
    expect(result.page.nextCursor).toBeTruthy();
  });

  it('should return null nextCursor when there are no more rows', () => {
    const rows = [{ id: 'a', createdAt: '2026-04-10T10:00:00.000Z' }];

    const result = buildCursorPage(rows, 10, (last) => ({
      id: last.id,
      createdAt: last.createdAt,
    }));

    expect(result.pageItems).toHaveLength(1);
    expect(result.page.hasMore).toBe(false);
    expect(result.page.nextCursor).toBeNull();
  });
});
