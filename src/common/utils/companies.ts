import { Op, type Order, type WhereOptions } from 'sequelize';
import { Company } from '../../db/models/company';
import { DEFAULT_PAGE_SIZE } from '../constants';
import type {
  CompanyCursorPayload,
  CompanyMembershipLike,
  CompanyQueryOptions,
  CompanySummary,
} from '../types/types';

export const buildCompanyQueryOptions = (query: Record<string, unknown>): CompanyQueryOptions => {
  const rawPageSize = Number(query.pageSize);
  const pageSize = Number.isFinite(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE;

  let isSelected: boolean | undefined;
  if (query.isSelected === 'true' || query.isSelected === true) isSelected = true;
  else if (query.isSelected === 'false' || query.isSelected === false) isSelected = false;

  return {
    search: query.search as string | undefined,
    pageSize,
    sortBy: query.sortBy as CompanyQueryOptions['sortBy'],
    isSelected,
    cursor: query.cursor as string | undefined,
  };
};

export const buildMembershipWhereClause = (
  userId: string,
  options: CompanyQueryOptions
): WhereOptions => {
  const baseWhere: Record<string, unknown> = { userId };

  if (typeof options.isSelected === 'boolean') {
    baseWhere.isSelected = options.isSelected;
  }

  return baseWhere as WhereOptions;
};

export const buildCompanyIncludeWhereClause = (search?: string): WhereOptions | undefined => {
  if (!search || !search.trim()) {
    return undefined;
  }

  const term = `%${search.trim()}%`;
  return {
    [Op.or]: [{ name: { [Op.like]: term } }, { legalName: { [Op.like]: term } }],
  } as WhereOptions;
};

export const buildCursorClause = (decoded: CompanyCursorPayload): WhereOptions => {
  const { sortField, sortValue, id } = decoded;

  if (sortField === 'isSelected') {
    return {
      [Op.or]: [
        { isSelected: { [Op.lt]: sortValue } },
        { [Op.and]: [{ isSelected: sortValue as boolean }, { companyId: { [Op.gt]: id } }] },
      ],
    } as WhereOptions;
  }

  const col = sortField === 'legalName' ? '$company.legalName$' : '$company.name$';
  return {
    [Op.or]: [
      { [col]: { [Op.gt]: sortValue as string } },
      { [Op.and]: [{ [col]: sortValue as string }, { companyId: { [Op.gt]: id } }] },
    ],
  } as WhereOptions;
};

export const buildOrderClause = (sortBy: NonNullable<CompanyQueryOptions['sortBy']>): Order => {
  if (sortBy === 'isSelected') {
    return [
      ['isSelected', 'DESC'],
      ['companyId', 'ASC'],
    ];
  }

  if (sortBy === 'legalName') {
    return [
      [{ model: Company, as: 'company' }, 'legalName', 'ASC'],
      ['companyId', 'ASC'],
    ];
  }

  return [
    [{ model: Company, as: 'company' }, 'name', 'ASC'],
    ['companyId', 'ASC'],
  ];
};

export const mapMembershipToSummary = (membership: CompanyMembershipLike): CompanySummary => ({
  id: membership.company!.id,
  name: membership.company!.name,
  legalName: membership.company!.legalName,
  isSelected: membership.isSelected ?? false,
  logoUrl: membership.company!.logoUrl,
});

/**
 * Returns the value to use for cursor-based pagination sorting for a company membership.
 */

export const getCompanySortValue = (
  membership: { isSelected?: boolean | null; company?: { name: string; legalName: string } | null },
  sortBy: 'name' | 'legalName' | 'isSelected'
): string | boolean => {
  if (sortBy === 'isSelected') return membership.isSelected ?? false;
  if (sortBy === 'legalName') return membership.company?.legalName ?? '';

  return membership.company?.name ?? '';
};
