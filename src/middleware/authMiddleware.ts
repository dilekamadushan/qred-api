// Authentication middleware for dev and production
import type { NextFunction, Request, Response } from 'express';
import { uuid } from '../db/seed/seed';

// In dev, always assign the first seed userId
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    process.env.NODE_ENV === 'test'
  ) {
    req.user = { userId: uuid.anna };
    return next();
  }

  // In prod, check for a Bearer token and do basic validation
  const authHeader = req.get('authorization') || req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next({ status: 401, message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice('Bearer '.length);
  // Basic validation: token must be 'valid-token' for demo purposes
  if (token !== 'valid-token') {
    return next({ status: 401, message: 'Invalid token' });
  }
  // In a real app, decode token and set user info
  req.user = { userId: 'from-token-user-id' };
  next();
}
