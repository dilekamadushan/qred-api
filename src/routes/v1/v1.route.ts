import { Router } from 'express';

import cardsRouter from './cards.route';
import dashboardRouter from './dashboard.route';
import transactionsRouter from './transactions.route';
import invoicesRouter from './invoices.route';
import spendRouter from './spend.route';

const v1Router = Router();

// Mount all v1 routers
v1Router.use(dashboardRouter);
v1Router.use(cardsRouter);
v1Router.use(transactionsRouter);
v1Router.use(invoicesRouter);
v1Router.use(spendRouter);

export default v1Router;
