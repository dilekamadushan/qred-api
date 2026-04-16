import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import express from 'express';
import path from 'path';

import { middleware as openApiValidator } from 'express-openapi-validator';

import { auth } from './middleware/auth';
import v1Router from './routes/v1/v1.route';
import healthRouter from './routes/health.route';

import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Core middleware
app.use(express.json());
app.use(cors());

app.use(requestLogger);

// OpenAPI validation
const apiSpecPath = path.join(__dirname, '../openapi/dist/openapi.bundle.yaml');
app.use(
  openApiValidator({
    apiSpec: apiSpecPath,
    validateRequests: true,
    validateResponses: true,
  })
);

// Health route should be public (no auth)
app.use(healthRouter);

app.use(auth);

// Protected routes (all v1 API routes)
app.use('/api/v1', v1Router);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
