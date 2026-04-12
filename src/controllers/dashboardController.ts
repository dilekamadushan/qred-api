import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problemDetails';
import { getDashboardForUser } from '../services/dashboard.service';

const DEFAULT_TRANSACTION_PREVIEW_LIMIT = 3;

export async function getDashboard(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const userId = request.user!.userId;
  const transactionPreviewLimit = request.query.transactionPreviewLimit
    ? Number(request.query.transactionPreviewLimit)
    : DEFAULT_TRANSACTION_PREVIEW_LIMIT;

  const data = await getDashboardForUser(userId, transactionPreviewLimit);

  if (!data) {
    return sendProblemDetails(
      response,
      createProblemDetails({
        req: request,
        status: HTTP_STATUS.NOT_FOUND,
        title: 'Not found',
        detail: 'No selected company found for the authenticated user.',
        code: 'selected_company_not_found',
      })
    );
  }

  return response.status(HTTP_STATUS.OK).json({ data });
}
