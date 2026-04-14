import { Company } from '../db/models/company';
import { UserCompanyMembership } from '../db/models/user-company-membership';
import { getDefaultCardForCompany } from './cards.service';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { getRemainingSpendForCompany } from './spend.service';
import { getTransactionPreviewForCompany } from './transactions.service';
import { logWarn } from '../common/utils/logUtils';
import { CARD_STATUS, DASHBOARD_SECTION_TIMEOUT_MS } from '../common/constants';
import { mapRemainingSpendToDashboardValue } from '../common/utils/money';
import { InternalServerError } from '../common/errors/appHttpError';

import type {
  CardValue,
  DashboardData,
  SectionError,
  SectionWithValue,
  SelectedCompanyResult,
} from '../common/types/types';

import { mapSection } from '../common/utils/dashboard';
import { withSlaTimeout } from '../common/utils/async';

export async function getDashboardForUser(
  userId: string,
  transactionPreviewLimit?: number
): Promise<DashboardData | null> {
  const selectedCompany = await sharedDbCircuitBreaker.execute(() =>
    withSlaTimeout(querySelectedCompany(userId), DASHBOARD_SECTION_TIMEOUT_MS)
  );

  if (!selectedCompany) return null;

  const previewLimit = transactionPreviewLimit ?? 3;

  // These run in parallel, but each section is isolated by loadSection so Promise.all still yields
  // an aggregated partial response instead of failing fast on section-level errors.
  const [card, spend, transactions] = await Promise.all([
    loadSection('card', async () => {
      const cardSummary = await withSlaTimeout(
        getDefaultCardForCompany(selectedCompany.companyId, userId),
        DASHBOARD_SECTION_TIMEOUT_MS
      );
      if (!cardSummary) {
        throw new InternalServerError({ detail: 'No default card found' });
      }

      const status =
        cardSummary.status === CARD_STATUS.CLOSED ? CARD_STATUS.BLOCKED : cardSummary.status;

      return {
        id: cardSummary.id,
        status,
        artworkUrl: cardSummary.artworkUrl,
      } satisfies CardValue;
    }),
    loadSection('spend', async () => {
      const spendSummary = await getRemainingSpendForCompany(userId, selectedCompany.companyId);
      if (!spendSummary) {
        throw new InternalServerError({ detail: 'No spend data available' });
      }
      return mapRemainingSpendToDashboardValue(spendSummary);
    }),
    loadSection('transactions', async () => {
      const preview = await getTransactionPreviewForCompany(
        selectedCompany.companyId,
        userId,
        previewLimit
      );
      return preview;
    }),
  ]);

  const cardSection: DashboardData['card'] = mapSection(card);
  const spendSection: DashboardData['spend'] = mapSection(spend);
  const transactionsSection: DashboardData['transactions'] = mapSection(transactions, (v) => ({
    items: v.items,
  }));
  const viewMoreSection: DashboardData['viewMore'] = mapSection(transactions, (v) => ({
    remainingTransactions: v.remainingTransactions,
  }));

  return {
    company: selectedCompany.section,
    card: cardSection,
    spend: spendSection,
    transactions: transactionsSection,
    viewMore: viewMoreSection,
  };
}

async function querySelectedCompany(userId: string): Promise<SelectedCompanyResult | null> {
  const includeCompany = [
    {
      model: Company,
      as: 'company',
      attributes: ['id', 'name'],
      required: true,
    },
  ];

  // this way we optimize finding selected company and total count
  const [selectedMembership, membershipCount] = await Promise.all([
    UserCompanyMembership.findOne({
      where: { userId },
      attributes: ['id', 'companyId', 'isSelected', 'createdAt'],
      include: includeCompany,
      order: [
        ['isSelected', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    }),
    UserCompanyMembership.count({ where: { userId } }),
  ]);

  if (!selectedMembership) return null;

  const company = selectedMembership.company;
  if (!company) return null;

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
}

async function loadSection<T>(
  name: string,
  action: () => Promise<T>
): Promise<SectionWithValue<T> | SectionError> {
  try {
    // Convert dependency failures into section-level errors so the dashboard can return partial data.
    return { value: await withSlaTimeout(action(), DASHBOARD_SECTION_TIMEOUT_MS) };
  } catch (error) {
    logWarn('DashboardService', `${name} section failed`, error);
    return {
      error: error instanceof Error ? error.message : 'Service unavailable',
    };
  }
}
