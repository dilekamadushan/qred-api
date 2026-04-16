import { sharedRateLimiter } from '../../middleware/rateLimiter';
import { Router } from 'express';

import {
  activateCard,
  blockCard,
  getCardById,
  getDefaultCard,
  unblockCard,
} from '../../controllers/cards.controller';

const router = Router();

router.get('/companies/:companyId/card/default', sharedRateLimiter, getDefaultCard);

router.get('/companies/:companyId/cards/:cardId', sharedRateLimiter, getCardById);

router.post('/companies/:companyId/cards/:cardId/block', sharedRateLimiter, blockCard);

router.post('/companies/:companyId/cards/:cardId/unblock', sharedRateLimiter, unblockCard);

router.post('/companies/:companyId/cards/:cardId/activate', sharedRateLimiter, activateCard);

export default router;
