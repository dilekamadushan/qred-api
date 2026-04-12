import { HTTP_STATUS } from '../common/constants';
import type { NextFunction, Request, Response } from 'express';
import { createProblemDetails, sendProblemDetails } from '../common/utils/problem-details';
import { getTransactionsForCompany } from '../services/transactions.service';
import { buildTransactionQueryOptions } from '../utils/transactions';
import { buildPaginationLinks } from '../utils/pagination';
import { DbCircuitOpenError } from '../services/circuitBreaker.service';
import type { components } from '../generated/openapi';

type TransactionListResponse = components['schemas']['TransactionListResponse'];

export async function getTransactions(request: Request, res: Response, next: NextFunction) {
  try {
    const companyId = request.params.companyId;
    const queryOptions = buildTransactionQueryOptions(request.query);

    const data = await getTransactionsForCompany(companyId as string, queryOptions);

    const { self, next } = buildPaginationLinks(request, data.page);

    const responseBody: TransactionListResponse = {
      data,
      links: {
        self,
        next,
      },
    };

    return res.status(HTTP_STATUS.OK).json(responseBody);
  } catch (error) {
    if (error instanceof DbCircuitOpenError)
      return sendProblemDetails(
        res,
        createProblemDetails({
          req: request,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          title: 'Service unavailable',
          detail:
            'The transaction data dependency is temporarily unavailable. Please retry shortly.',
          code: 'service_unavailable',
        })
      );
    next(error);
  }
}
