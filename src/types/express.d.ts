import type { User } from '../common/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}
