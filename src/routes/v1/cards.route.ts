import { sharedRateLimiter } from '../../middleware/rateLimiter';
import { Router } from 'express';

import { getDefaultCard } from '../../controllers/cardsController';

const router = Router();

// GET /api/v1/companies/:companyId/card/default
router.get('/companies/:companyId/card/default', sharedRateLimiter, getDefaultCard);

export default router;
