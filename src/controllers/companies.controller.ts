import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants';
import { NotFoundError } from '../common/errors/appHttpError';
import { buildCompanyQueryOptions } from '../common/utils/companies';
import { buildPaginationLinks } from '../common/utils/pagination';
import { getCompaniesForUser, selectCompanyForUser } from '../services/companies.service';

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

  const updated = await selectCompanyForUser(userId, companyId);

  if (!updated) {
    throw new NotFoundError({
      detail: `Company ${companyId} not found in user's memberships.`,
      code: 'company_membership_not_found',
    });
  }

  return response.status(HTTP_STATUS.OK).json({ success: true });
}
