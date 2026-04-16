import { getDefaultCardForCompany } from './cards.service';
import { getRemainingSpendForCompany } from './spend.service';
import { getTransactionPreviewForCompany } from './transactions.service';
import { logWarn } from '../common/utils/logUtils';
import { NotFoundError, ServiceUnavailableError } from '../common/errors/appHttpError';
import { CARD_STATUS } from '../common/constants';
import { mapRemainingSpendToDashboardValue } from '../common/utils/money';

import type {
  CardValue,
  DashboardData,
  SectionError,
  SectionWithValue,
} from '../common/types/types';

import { hasSectionError, mapSection } from '../common/utils/dashboard';
import { withSlaTimeout } from '../common/utils/async';
import { getSelectedCompanyForUser } from './companies.service';

export async function getDashboardForUser(
  userId: string,
  transactionPreviewLimit: number
): Promise<DashboardData> {
  const selectedCompany = await withSlaTimeout(
    getSelectedCompanyForUser(userId),
    'selected company query'
  );

  // These run in parallel, but each section is isolated by loadSection so Promise.all still yields
  // an aggregated partial response instead of failing fast on section-level errors.
  const [card, spend, transactions] = await Promise.all([
    loadCardSection(selectedCompany.companyId, userId),
    loadSpendSection(userId, selectedCompany.companyId),
    loadTransactionsSection(selectedCompany.companyId, userId, transactionPreviewLimit),
  ]);

  const cardSection: DashboardData['card'] = mapSection(card);
  const spendSection: DashboardData['spend'] = mapSection(spend);
  const transactionsSection: DashboardData['transactions'] = mapSection(transactions, (v) => ({
    items: v.items,
  }));
  const viewMoreSection: DashboardData['viewMore'] = mapSection(transactions, (v) => ({
    remainingTransactions: v.remainingTransactions,
  }));

  if (
    hasSectionError(cardSection) &&
    hasSectionError(spendSection) &&
    hasSectionError(transactionsSection)
  ) {
    logWarn(
      'DashboardService',
      'All core sections failed to load. Returning service unavailable error.'
    );
    throw new ServiceUnavailableError({
      detail:
        'Dashboard data is temporarily unavailable because all core sections failed. Please retry shortly.',
      code: 'service_unavailable',
    });
  }

  return {
    company: selectedCompany.section,
    card: cardSection,
    spend: spendSection,
    transactions: transactionsSection,
    viewMore: viewMoreSection,
  };
}

// Section loader for card
async function loadCardSection(companyId: string, userId: string) {
  return loadSection('card', async () => {
    try {
      const cardSummary = await withSlaTimeout(
        getDefaultCardForCompany(companyId, userId),
        'card lookup'
      );

      const status =
        cardSummary.status === CARD_STATUS.CLOSED ? CARD_STATUS.BLOCKED : cardSummary.status;

      return {
        id: cardSummary.id,
        status: status as CardValue['status'],
        artworkUrl: cardSummary.artworkUrl,
      } satisfies CardValue;
    } catch (error) {
      if (error instanceof NotFoundError) return null;

      throw error;
    }
  });
}

// Section loader for spend
async function loadSpendSection(userId: string, companyId: string) {
  return loadSection('spend', async () => {
    try {
      const spendSummary = await getRemainingSpendForCompany(userId, companyId);

      return mapRemainingSpendToDashboardValue(spendSummary);
    } catch (error) {
      if (error instanceof NotFoundError) return null;

      throw error;
    }
  });
}

// Section loader for transactions
async function loadTransactionsSection(
  companyId: string,
  userId: string,
  transactionPreviewLimit: number
) {
  return loadSection('transactions', async () => {
    const preview = await getTransactionPreviewForCompany(
      companyId,
      userId,
      transactionPreviewLimit
    );
    return preview;
  });
}

async function loadSection<T>(
  name: string,
  action: () => Promise<T>
): Promise<SectionWithValue<T> | SectionError> {
  try {
    // Convert dependency failures into section-level errors so the dashboard can return partial data.
    return { value: await withSlaTimeout(action(), `${name} section`) };
  } catch (error) {
    logWarn('DashboardService', `${name} section failed`, error);

    return {
      error: error instanceof Error ? error.message : 'Service unavailable',
    };
  }
}
