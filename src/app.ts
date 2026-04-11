import express, { type NextFunction, type Request, type Response } from 'express';
import healthRouter from './routes/health';
import path from 'path';
import { middleware as openApiValidator } from 'express-openapi-validator';

const app = express();
app.use(express.json());

app.use(healthRouter);

const apiSpecPath = path.join(__dirname, '../openapi/dist/openapi.bundle.yaml');
app.use(
  openApiValidator({
    apiSpec: apiSpecPath,
    validateRequests: true,
    validateResponses: true,
  })
);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
  });
});

app.use((err: Error & { status?: number; errors?: unknown }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.status ?? 500).json({
    message: err.message,
    errors: err.errors,
  });
});

export default app;
