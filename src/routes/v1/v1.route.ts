import { Router } from 'express';

import cardsRouter from './cards.route';
import transactionsRouter from './transactions.route';

const v1Router = Router();

// Mount all v1 routers
v1Router.use(cardsRouter);
v1Router.use(transactionsRouter);

export default v1Router;
