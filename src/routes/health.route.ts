import { HTTP_STATUS } from '../common/constants';
import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({ status: 'ok' });
});

export default router;
