import { HTTP_STATUS } from '../common/constants';
import type { Request, Response } from 'express';
import { getTransactionsForCompany } from '../services/transactions.service';
import { buildTransactionQueryOptions } from '../common/utils/transactions';
import { buildPaginationLinks } from '../common/utils/pagination';
import type { components } from '../generated/openapi';

type TransactionListResponse = components['schemas']['TransactionListResponse'];

export async function getTransactions(request: Request, res: Response) {
  // Errors are intentionally forwarded to the global error handler middleware
  const companyId = request.params.companyId;
  const userId = request.user!.userId;
  const queryOptions = buildTransactionQueryOptions(request.query);

  const data = await getTransactionsForCompany(companyId as string, userId, queryOptions);

  const { self, next: nextLink } = buildPaginationLinks(request, data.page);

  const responseBody: TransactionListResponse = {
    data,
    links: {
      self,
      next: nextLink,
    },
  };

  return res.status(HTTP_STATUS.OK).json(responseBody);
}
