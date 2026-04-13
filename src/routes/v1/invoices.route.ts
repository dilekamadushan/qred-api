import { Router } from 'express';
import { getLatestInvoice } from '../../controllers/invoices.controller';
import { sharedRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// GET /api/v1/companies/:companyId/invoices/latest
router.get('/companies/:companyId/invoices/latest', sharedRateLimiter, getLatestInvoice);

export default router;
