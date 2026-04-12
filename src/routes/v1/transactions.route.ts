import { sharedRateLimiter } from '../../middleware/rateLimiter';
import { Router } from 'express';
import { getTransactions } from '../../controllers/transactionsController';

const router = Router();

// GET /api/v1/companies/:companyId/transactions
router.get('/companies/:companyId/transactions', sharedRateLimiter, getTransactions);

export default router;
