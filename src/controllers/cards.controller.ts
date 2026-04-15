import type { Request, Response } from 'express';
import type { components } from '../generated/openapi';
import { getDefaultCardForCompany } from '../services/cards.service';
import { HTTP_STATUS } from '../common/constants';

export async function getDefaultCard(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const companyId = request.params.companyId;
  const userId = request.user!.userId;
  const card = await getDefaultCardForCompany(companyId as string, userId);

  return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
}
