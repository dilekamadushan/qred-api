import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { getDashboardForUser } from '../services/dashboard.service';
import { NotFoundError, ServiceUnavailableError } from '../common/errors/appHttpError';
import { hasSectionError } from '../common/utils/dashboard';

const DEFAULT_TRANSACTION_PREVIEW_LIMIT = 3;

export async function getDashboard(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const userId = request.user!.userId;
  const transactionPreviewLimit = request.query.transactionPreviewLimit
    ? Number(request.query.transactionPreviewLimit)
    : DEFAULT_TRANSACTION_PREVIEW_LIMIT;

  const data = await getDashboardForUser(userId, transactionPreviewLimit);

  if (!data) {
    throw new NotFoundError({
      detail: 'No selected company found for the authenticated user.',
      code: 'selected_company_not_found',
    });
  }

  if (
    hasSectionError(data.card) &&
    hasSectionError(data.spend) &&
    hasSectionError(data.transactions)
  ) {
    throw new ServiceUnavailableError({
      detail:
        'Dashboard data is temporarily unavailable because all core sections failed. Please retry shortly.',
      code: 'service_unavailable',
    });
  }

  return response.status(HTTP_STATUS.OK).json({ data });
}
