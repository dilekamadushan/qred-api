import { Router } from 'express';
import cardsRouter from './cards.route';
// import other v1 routers here as you add them

const v1Router = Router();

// Mount all v1 routers
v1Router.use(cardsRouter);
// v1Router.use(companiesRouter); // example for future

export default v1Router;
