import { HTTP_STATUS } from '../common/constants';
import type { NextFunction, Request, Response } from 'express';
import type { components } from '../generated/openapi';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problem-details';
import { getDefaultCardForCompany } from '../services/cards.service';
import { DbCircuitOpenError } from '../services/circuitBreaker.service';

export async function getDefaultCard(request: Request, response: Response, next: NextFunction) {
  try {
    const companyId = request.params.companyId;
    const userId = request.user!.userId;
    const card = await getDefaultCardForCompany(companyId as string, userId);

    if (!card)
      return sendProblemDetails(
        response,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.NOT_FOUND,
          title: 'Not found',
          detail: `No default card exists for company ${companyId}.`,
          code: 'default_card_not_found',
        })
      );
    return response.status(HTTP_STATUS.OK).json(card as components['schemas']['CardSummary']);
  } catch (error) {
    if (error instanceof DbCircuitOpenError)
      return sendProblemDetails(
        response,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          title: 'Service unavailable',
          detail: 'The card data dependency is temporarily unavailable. Please retry shortly.',
          code: 'service_unavailable',
        })
      );

    next(error);
  }
}
