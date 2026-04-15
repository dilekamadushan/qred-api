import { logError } from '../common/utils/logUtils';
import { UserCompanySpend } from '../db/models/user-company-spend';
import { sharedDbCircuitBreaker } from './circuitBreaker.service';
import { InternalServerError, NotFoundError } from '../common/errors/appHttpError';
import { calculateSpendUtilization } from '../common/utils/money';
import type { RemainingSpendSummary } from '../common/types/types';

export function getRemainingSpendForCompany(
  userId: string,
  companyId: string
): Promise<RemainingSpendSummary> {
  return sharedDbCircuitBreaker.execute(() => queryRemainingSpend(userId, companyId));
}

async function queryRemainingSpend(
  userId: string,
  companyId: string
): Promise<RemainingSpendSummary> {
  try {
    const spend = await UserCompanySpend.findOne({
      where: { userId, companyId },
      attributes: ['limitMinor', 'remainingMinor', 'currency'],
      raw: true,
    });

    if (!spend)
      throw new NotFoundError({
        detail: `No remaining spend data found for company ${companyId}.`,
        code: 'remaining_spend_not_found',
      });

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
    if (error instanceof NotFoundError) throw error;

    logError('SpendService', `Error querying spend for companyId: ${companyId}`, error);

    throw new InternalServerError({ detail: 'Failed to load spend data.' });
  }
}
