import type { components } from '../../generated/openapi';
import type { RemainingSpendSummary } from '../types/types';

export const toMajorAmountFromMinor = (amountMinor: number): number => {
  return Number((amountMinor / 100).toFixed(2));
};

export const calculateSpendUtilization = (limitMinor: number, remainingMinor: number) => {
  const spentMinor = Math.max(limitMinor - remainingMinor, 0);
  const utilizationPercent = limitMinor > 0 ? Math.round((spentMinor / limitMinor) * 100) : 0;

  return { spentMinor, utilizationPercent };
};

export const mapRemainingSpendToDashboardValue = (
  spend: RemainingSpendSummary
): components['schemas']['DashboardResponse']['data']['spend']['value'] => {
  return {
    used: toMajorAmountFromMinor(spend.spent),
    total: toMajorAmountFromMinor(spend.limit),
    currency: spend.currency,
  };
};
