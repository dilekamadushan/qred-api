import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { buildCompanyQueryOptions } from '../common/utils/companies';
import { buildPaginationLinks } from '../common/utils/pagination';
import { getCompaniesForUser, updateSelectedCompanyForUser } from '../services/companies.service';

export async function listCompanies(request: Request, response: Response) {
  // Errors are intentionally forwarded to the global error handler middleware.
  const userId = request.user!.userId;
  const queryOptions = buildCompanyQueryOptions(request.query as Record<string, unknown>);

  const data = await getCompaniesForUser(userId, queryOptions);

  const { self, next: nextLink } = buildPaginationLinks(request, data.page);

  return response.status(HTTP_STATUS.OK).json({
    data,
    links: {
      self,
      next: nextLink,
      prev: null,
    },
  });
}

export async function updateCompanySelection(request: Request, response: Response) {
  const userId = request.user!.userId;
  const { companyId } = request.body as { companyId: string };

  await updateSelectedCompanyForUser(userId, companyId);

  return response.status(HTTP_STATUS.OK).json({ success: true });
}
