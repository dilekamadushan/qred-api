import type { components } from '../generated/openapi';
import { Company } from '../db/models/company';
import { UserCompanyMembership } from '../db/models/user-company-membership';
import { getDefaultCardForCompany } from './cards.service';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import {
  getRemainingSpendForCompany,
  mapRemainingSpendToDashboardValue,
  remainingSpendCircuitBreaker,
} from './spend.service';
import {
  getTransactionPreviewForCompany,
  transactionsCircuitBreaker,
} from './transactions.service';
import { logError, logWarn } from '../common/utils/logUtils';
import { CARD_STATUS } from '../common/constants';

const DEFAULT_TRANSACTION_PREVIEW_LIMIT = 3;
const MIN_TRANSACTION_PREVIEW_LIMIT = 1;
const MAX_TRANSACTION_PREVIEW_LIMIT = 10;
const DASHBOARD_SECTION_TIMEOUT_MS = 1200;

type DashboardData = components['schemas']['DashboardResponse']['data'];
type CardValue = NonNullable<DashboardData['card']['value']>;
type TransactionsValue = NonNullable<DashboardData['transactions']['value']>;
type ViewMoreValue = NonNullable<DashboardData['viewMore']['value']>;

type SectionWithValue<T> = { value: T };
type SectionError = { error: string };

type SelectedCompanyResult = {
  companyId: string;
  section: DashboardData['company'];
};

function normalizePreviewLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_TRANSACTION_PREVIEW_LIMIT;
  }

  return Math.max(MIN_TRANSACTION_PREVIEW_LIMIT, Math.min(MAX_TRANSACTION_PREVIEW_LIMIT, limit));
}

async function withSlaTimeout<T>(
  operation: Promise<T>,
  timeoutMs = DASHBOARD_SECTION_TIMEOUT_MS
): Promise<T> {
  // Each dashboard section has its own SLA so one slow dependency does not block the full response.
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(' SLA Timeout')), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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
    return { value: await withSlaTimeout(action()) };
  } catch (error) {
    logWarn('DashboardService', `${name} section failed`, error);
    return {
      error: error instanceof Error ? error.message : 'Service unavailable',
    };
  }
}

export const dashboardCompanyCircuitBreaker = sharedDbCircuitBreaker;
export const dashboardSpendCircuitBreaker = remainingSpendCircuitBreaker;
export const dashboardTransactionsCircuitBreaker = transactionsCircuitBreaker;

export async function getDashboardForUser(
  userId: string,
  transactionPreviewLimit?: number
): Promise<DashboardData | null> {
  try {
    const selectedCompany = await dashboardCompanyCircuitBreaker.execute(() =>
      withSlaTimeout(querySelectedCompany(userId))
    );

    if (!selectedCompany) return null;

    const previewLimit = normalizePreviewLimit(transactionPreviewLimit);

    // These run in parallel, but each section is isolated by loadSection so Promise.all still yields
    // an aggregated partial response instead of failing fast on section-level errors.
    const [card, spend, transactions] = await Promise.all([
      loadSection('card', async () => {
        const cardSummary = await withSlaTimeout(
          getDefaultCardForCompany(selectedCompany.companyId, userId)
        );
        if (!cardSummary) {
          throw new Error('No default card found');
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
          throw new Error('No spend data available');
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

    const cardSection: DashboardData['card'] =
      'value' in card ? { value: card.value } : { error: card.error };

    const spendSection: DashboardData['spend'] =
      'value' in spend ? { value: spend.value } : { error: spend.error };

    const transactionsSection: DashboardData['transactions'] =
      'value' in transactions
        ? {
            value: {
              items: transactions.value.items,
            } satisfies TransactionsValue,
          }
        : { error: transactions.error };

    const viewMoreSection: DashboardData['viewMore'] =
      'value' in transactions
        ? {
            value: {
              remainingTransactions: transactions.value.remainingTransactions,
            } satisfies ViewMoreValue,
          }
        : { error: transactions.error };

    return {
      company: selectedCompany.section,
      card: cardSection,
      spend: spendSection,
      transactions: transactionsSection,
      viewMore: viewMoreSection,
    };
  } catch (error) {
    logError('DashboardService', `Failed to build dashboard for userId: ${userId}`, error);
    throw error;
  }
}
