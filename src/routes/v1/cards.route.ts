import { createDefaultRateLimiter } from '../../middleware/defaultCardRateLimiter';
import { Router } from 'express';

import { getDefaultCard } from '../../controllers/cardsController';

const router = Router();

// GET /api/v1/companies/:companyId/card/default
const defaultCardRateLimiter = createDefaultRateLimiter({
  errorMessage: 'Too many requests were made to the default-card endpoint. Please retry later.',
  errorCode: 'rate_limited',
});
router.get('/companies/:companyId/card/default', defaultCardRateLimiter, getDefaultCard);

export default router;
