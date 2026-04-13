import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { NotFoundError } from '../common/errors/appHttpError';
import { getRemainingSpendForCompany } from '../services/spend.service';

export async function getRemainingSpend(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const companyId = request.params.companyId as string;
  const userId = request.user!.userId;
  const spend = await getRemainingSpendForCompany(userId, companyId);

  if (!spend) {
    throw new NotFoundError({
      detail: `No remaining spend data found for company ${companyId}.`,
      code: 'remaining_spend_not_found',
    });
  }

  return response.status(HTTP_STATUS.OK).json(spend);
}
