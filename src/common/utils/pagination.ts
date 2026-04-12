import type { Request } from 'express';

interface PageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export function buildPaginationLinks(
  request: Request,
  page: PageInfo
): { self: string; next: string | null } {
  const url = new URL(`${request.protocol}://${request.get('host')}${request.originalUrl}`);
  const self = url.toString();
  let next: string | null;
  if (page.hasMore && page.nextCursor) {
    const nextUrl = new URL(self);
    nextUrl.searchParams.set('cursor', page.nextCursor);
    nextUrl.searchParams.set('pageSize', String(page.pageSize));
    next = nextUrl.toString();
  } else {
    next = null;
  }
  return { self, next };
}

/**
 * Encodes a cursor object (e.g., { createdAt, id }) as a base64 string.
 */
export function encodeCursor(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

/**
 * Decodes a base64 cursor string to an object.
 */
export function decodeCursor<T = unknown>(cursor: string): T | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}
