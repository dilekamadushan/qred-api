import { Op, type WhereOptions } from 'sequelize';
import { Company } from '../db/models/company';
import { UserCompanyMembership } from '../db/models/user-company-membership';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import { InternalServerError } from '../common/errors/appHttpError';
import { DEFAULT_PAGE_SIZE } from '../common/constants';
import { buildCursorPage, decodeCursor } from '../common/utils/pagination';
import { getCompanySortValue } from '../common/utils/companies';
import {
  buildCompanyIncludeWhereClause,
  buildCursorClause,
  buildMembershipWhereClause,
  buildOrderClause,
  mapMembershipToSummary,
} from '../common/utils/companies';

import type {
  CompanyCursorPayload,
  CompanyListData,
  CompanyQueryOptions,
} from '../common/types/types';

export function getCompaniesForUser(
  userId: string,
  options: CompanyQueryOptions = {}
): Promise<CompanyListData> {
  return sharedDbCircuitBreaker.execute(() => queryCompanies(userId, options));
}

export function selectCompanyForUser(userId: string, companyId: string): Promise<boolean> {
  return sharedDbCircuitBreaker.execute(() => querySelectCompany(userId, companyId));
}

async function queryCompanies(
  userId: string,
  options: CompanyQueryOptions
): Promise<CompanyListData> {
  try {
    const { search, pageSize = DEFAULT_PAGE_SIZE, sortBy = 'name', cursor } = options;
    const membershipWhere = buildMembershipWhereClause(userId, options);
    const companyIncludeWhere = buildCompanyIncludeWhereClause(search);

    const decoded = cursor ? decodeCursor<CompanyCursorPayload>(cursor) : null;
    const cursorClause = decoded ? buildCursorClause(decoded) : undefined;

    const finalWhere: WhereOptions = cursorClause
      ? ({ [Op.and]: [membershipWhere, cursorClause] } as WhereOptions)
      : membershipWhere;

    const memberships = await UserCompanyMembership.findAll({
      where: finalWhere,
      include: [
        {
          model: Company,
          as: 'company',
          required: true,
          attributes: ['id', 'name', 'legalName', 'logoUrl'],
          ...(companyIncludeWhere ? { where: companyIncludeWhere } : {}),
        },
      ],
      order: buildOrderClause(sortBy),
      limit: pageSize + 1,
    });

    const { pageItems, page } = buildCursorPage(memberships, pageSize, (last) => ({
      sortField: sortBy,
      sortValue: getCompanySortValue(last, sortBy),
      id: last.companyId,
    }));

    const items = pageItems.map(mapMembershipToSummary);

    return { items, page };
  } catch (error) {
    logError('CompaniesService', `Error querying companies for userId: ${userId}`, error);

    throw new InternalServerError({ detail: 'Failed to load companies data.' });
  }
}

async function querySelectCompany(userId: string, companyId: string): Promise<boolean> {
  try {
    const membership = await UserCompanyMembership.findOne({ where: { userId, companyId } });
    if (!membership) return false;

    // Deselect all first, then select the target (respects unique partial index)
    await UserCompanyMembership.update({ isSelected: false }, { where: { userId } });
    await UserCompanyMembership.update({ isSelected: true }, { where: { userId, companyId } });

    return true;
  } catch (error) {
    logError('CompaniesService', `Error querying companies for userId: ${userId}`, error);

    throw new InternalServerError({ detail: 'Failed to update company selection.' });
  }
}
