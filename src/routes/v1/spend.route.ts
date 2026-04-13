import { Router } from 'express';
import { sharedRateLimiter } from '../../middleware/rateLimiter';
import { getRemainingSpend } from '../../controllers/spend.controller';

const router = Router();

// GET /api/v1/companies/:companyId/remaining-spend
router.get('/companies/:companyId/remaining-spend', sharedRateLimiter, getRemainingSpend);

export default router;
