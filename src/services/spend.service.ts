import type { components } from '../generated/openapi';
import { logError, logWarn } from '../common/utils/logUtils';
import { UserCompanySpend } from '../db/models/user-company-spend';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { DbCircuitOpenError, InternalServerError } from '../common/errors/appHttpError';

type RemainingSpendSummary = components['schemas']['RemainingSpendSummary'];

function toDashboardAmount(amountMinor: number): number {
  return Number((amountMinor / 100).toFixed(2));
}

async function queryRemainingSpend(
  userId: string,
  companyId: string
): Promise<RemainingSpendSummary | null> {
  try {
    const spend = await UserCompanySpend.findOne({
      where: { userId, companyId },
      attributes: ['limitMinor', 'remainingMinor', 'currency'],
      raw: true,
    });

    if (!spend) {
      logWarn('SpendService', `No spend data found for companyId: ${companyId}`);
      return null;
    }

    const spentMinor = Math.max(spend.limitMinor - spend.remainingMinor, 0);
    const utilizationPercent =
      spend.limitMinor > 0 ? Math.round((spentMinor / spend.limitMinor) * 100) : 0;

    return {
      spent: spentMinor,
      limit: spend.limitMinor,
      remaining: spend.remainingMinor,
      utilizationPercent,
      currency: spend.currency,
      label: 'based on your set limit',
    };
  } catch (error) {
    logError('SpendService', `Error querying spend for companyId: ${companyId}`, error);

    throw new InternalServerError({ detail: 'Failed to load spend data.' });
  }
}

export const remainingSpendCircuitBreaker = sharedDbCircuitBreaker;

export async function getRemainingSpendForCompany(
  userId: string,
  companyId: string
): Promise<RemainingSpendSummary | null> {
  try {
    return await remainingSpendCircuitBreaker.execute(() => queryRemainingSpend(userId, companyId));
  } catch (error) {
    if (error instanceof DbCircuitOpenError) {
      logWarn('SpendService', `Circuit breaker is OPEN for companyId: ${companyId}`);
      throw error;
    }

    throw new InternalServerError({ detail: 'Failed to load spend data.' });
  }
}

export function mapRemainingSpendToDashboardValue(
  spend: RemainingSpendSummary
): components['schemas']['DashboardResponse']['data']['spend']['value'] {
  return {
    used: toDashboardAmount(spend.spent),
    total: toDashboardAmount(spend.limit),
    currency: spend.currency,
  };
}
