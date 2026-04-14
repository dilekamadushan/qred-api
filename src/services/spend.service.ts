import { logError, logWarn } from '../common/utils/logUtils';
import { UserCompanySpend } from '../db/models/user-company-spend';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { InternalServerError } from '../common/errors/appHttpError';
import { calculateSpendUtilization } from '../common/utils/money';
import type { RemainingSpendSummary } from '../common/types/types';

export function getRemainingSpendForCompany(
  userId: string,
  companyId: string
): Promise<RemainingSpendSummary | null> {
  return sharedDbCircuitBreaker.execute(() => queryRemainingSpend(userId, companyId));
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

    const { spentMinor, utilizationPercent } = calculateSpendUtilization(
      spend.limitMinor,
      spend.remainingMinor
    );

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
