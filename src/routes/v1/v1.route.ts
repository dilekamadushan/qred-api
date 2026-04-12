import { Router } from 'express';

import cardsRouter from './cards.route';
import transactionsRouter from './transactions.route';
import invoicesRouter from './invoices.route';

const v1Router = Router();

// Mount all v1 routers
v1Router.use(cardsRouter);
v1Router.use(transactionsRouter);
v1Router.use(invoicesRouter);

export default v1Router;
