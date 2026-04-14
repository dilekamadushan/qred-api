import { Router } from 'express';
import { sharedRateLimiter } from '../../middleware/rateLimiter';
import { listCompanies, updateCompanySelection } from '../../controllers/companies.controller';

const router = Router();

router.get('/companies', sharedRateLimiter, listCompanies);

router.patch('/user/company-selection', sharedRateLimiter, updateCompanySelection);

export default router;
