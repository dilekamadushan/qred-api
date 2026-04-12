import { HTTP_STATUS } from '../common/constants';
import type { NextFunction, Request, Response } from 'express';

import { createProblemDetails, sendProblemDetails } from '../common/utils/problem-details';
import { getDefaultCardForCompany } from '../services/cards.service';
import { DbCircuitOpenError } from '../services/circuitBreaker.service';

export async function getDefaultCard(request: Request, res: Response, next: NextFunction) {
  try {
    const companyId = request.params.companyId;
    const userId = request.user!.userId;
    const card = await getDefaultCardForCompany(companyId as string, userId);

    if (!card)
      return sendProblemDetails(
        res,
        createProblemDetails(
          request,
          HTTP_STATUS.NOT_FOUND,
          'Not found',
          `No default card exists for company ${companyId}.`,
          'default_card_not_found'
        )
      );

    return res.status(HTTP_STATUS.OK).json(card);
  } catch (error) {
    if (error instanceof DbCircuitOpenError)
      return sendProblemDetails(
        res,
        createProblemDetails(
          request,
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          'Service unavailable',
          'The card data dependency is temporarily unavailable. Please retry shortly.',
          'service_unavailable'
        )
      );

    next(error);
  }
}
