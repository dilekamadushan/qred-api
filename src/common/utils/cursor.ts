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
