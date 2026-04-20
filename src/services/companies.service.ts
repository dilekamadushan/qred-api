import { Op, type WhereOptions } from 'sequelize';
import { Company } from '../db/models/company';
import { UserCompanyMembership } from '../db/models/user-company-membership';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { logError } from '../common/utils/logUtils';
import { InternalServerError, NotFoundError } from '../common/errors/appHttpError';
import { DEFAULT_PAGE_SIZE, SORT_ORDER } from '../common/constants';
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
  SelectedCompanyResult,
} from '../common/types/types';
import { sequelize } from '../db/sequelize';

export function getCompaniesForUser(
  userId: string,
  options: CompanyQueryOptions = {}
): Promise<CompanyListData> {
  return sharedDbCircuitBreaker.execute(() => queryCompanies(userId, options));
}

export function updateSelectedCompanyForUser(userId: string, companyId: string): Promise<boolean> {
  return sharedDbCircuitBreaker.execute(() => queryUpdateSelectedCompany(userId, companyId));
}

export function getSelectedCompanyForUser(userId: string): Promise<SelectedCompanyResult> {
  return sharedDbCircuitBreaker.execute(() => querySelectedCompany(userId));
}

async function querySelectedCompany(userId: string): Promise<SelectedCompanyResult> {
  const includeCompany = [
    {
      model: Company,
      as: 'company',
      attributes: ['id', 'name'],
      required: true,
    },
  ];

  try {
    // this way we optimize finding selected company and total count
    // if no default company is selected, we take the most recently added company as selected, so we order by isSelected and createdAt
    const [selectedMembership, membershipCount] = await Promise.all([
      UserCompanyMembership.findOne({
        where: { userId },
        attributes: ['id', 'companyId', 'isSelected', 'createdAt'],
        include: includeCompany,
        order: [
          ['isSelected', SORT_ORDER.DESC],
          ['createdAt', SORT_ORDER.DESC],
        ],
      }),
      UserCompanyMembership.count({ where: { userId } }),
    ]);

    if (!selectedMembership || !selectedMembership.company)
      throw new NotFoundError({
        detail: 'No selected company found for the authenticated user.',
        code: 'selected_company_not_found',
      });

    const company = selectedMembership.company;

    return {
      companyId: company.id,
      section: {
        value: {
          id: company.id,
          name: company.name,
          hasMoreCompanies: membershipCount > 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;

    logError('CompaniesService', `Error querying selected company for userId: ${userId}`, error);
    throw new InternalServerError({ detail: 'Failed to load selected company data.' });
  }
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

async function queryUpdateSelectedCompany(userId: string, companyId: string): Promise<boolean> {
  const transaction = await sequelize.transaction();

  try {
    const [anyCompanyCount] = await UserCompanyMembership.update(
      { isSelected: false },
      { where: { userId }, transaction }
    );

    if (!anyCompanyCount)
      throw new NotFoundError({
        detail: 'No company membership found for the requested company.',
        code: 'company_membership_not_found',
        title: 'company_membership_not_found',
      });

    const [updatedCount] = await UserCompanyMembership.update(
      { isSelected: true },
      { where: { userId, companyId }, transaction }
    );

    if (!updatedCount)
      throw new NotFoundError({
        detail: 'No company membership found for the requested company.',
        code: 'company_membership_not_found',
        title: 'company_membership_not_found',
      });

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();

    if (error instanceof NotFoundError) throw error;

    logError(
      'CompaniesService',
      `Error updating selected company ${companyId} for userId: ${userId}`,
      error
    );

    throw new InternalServerError({ detail: 'Failed to update company selection.' });
  }
}
