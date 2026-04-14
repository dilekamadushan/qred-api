import {
  calculateSpendUtilization,
  mapRemainingSpendToDashboardValue,
} from '../../../src/common/utils/money';
describe('calculateSpendUtilization', () => {
  it('calculates spent and utilization percent correctly', () => {
    expect(calculateSpendUtilization(1000, 400)).toEqual({
      spentMinor: 600,
      utilizationPercent: 60,
    });
    expect(calculateSpendUtilization(1000, 0)).toEqual({
      spentMinor: 1000,
      utilizationPercent: 100,
    });
    expect(calculateSpendUtilization(1000, 1000)).toEqual({ spentMinor: 0, utilizationPercent: 0 });
    expect(calculateSpendUtilization(0, 0)).toEqual({ spentMinor: 0, utilizationPercent: 0 });
    expect(calculateSpendUtilization(1000, 1200)).toEqual({ spentMinor: 0, utilizationPercent: 0 });
  });
});

describe('mapRemainingSpendToDashboardValue', () => {
  it('maps minor-unit spend summary to dashboard display values', () => {
    expect(
      mapRemainingSpendToDashboardValue({
        spent: 380000,
        limit: 500000,
        remaining: 120000,
        utilizationPercent: 76,
        currency: 'SEK',
        label: 'based on your set limit',
      })
    ).toEqual({
      used: 3800,
      total: 5000,
      currency: 'SEK',
    });
  });
});
