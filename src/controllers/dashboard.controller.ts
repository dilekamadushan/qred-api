import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { getDashboardForUser } from '../services/dashboard.service';

const DEFAULT_TRANSACTION_PREVIEW_LIMIT = 3;

export async function getDashboard(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const userId = request.user!.userId;
  const transactionPreviewLimit = request.query.transactionPreviewLimit
    ? Number(request.query.transactionPreviewLimit)
    : DEFAULT_TRANSACTION_PREVIEW_LIMIT;

  const data = await getDashboardForUser(userId, transactionPreviewLimit);

  return response.status(HTTP_STATUS.OK).json({ data });
}
