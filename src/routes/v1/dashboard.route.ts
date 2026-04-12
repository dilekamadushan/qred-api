import { Router } from 'express';
import { getDashboard } from '../../controllers/dashboardController';
import { sharedRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// GET /api/v1/dashboard
router.get('/dashboard', sharedRateLimiter, getDashboard);

export default router;
