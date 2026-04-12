import { UserCompanyMembership } from '../../src/db/models/user-company-membership';
import {
  dashboardCompanyCircuitBreaker,
  dashboardSpendCircuitBreaker,
  dashboardTransactionsCircuitBreaker,
  getDashboardForUser,
} from '../../src/services/dashboard.service';
import * as CardsService from '../../src/services/cards.service';
import * as SpendService from '../../src/services/spend.service';
import * as TransactionService from '../../src/services/transactions.service';

jest.mock('../../src/db/models/company');
jest.mock('../../src/db/models/user-company-membership');

describe('dashboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dashboardCompanyCircuitBreaker.execute = jest.fn(async (action) => action());
    dashboardSpendCircuitBreaker.execute = jest.fn(async (action) => action());
    dashboardTransactionsCircuitBreaker.execute = jest.fn(async (action) => action());
  });

  describe('getDashboardForUser', () => {
    it('returns aggregated dashboard data', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValue({
        id: 'mem_1',
        companyId: 'cmp_1',
        isSelected: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        company: { id: 'cmp_1', name: 'Company AB' },
      });
      (UserCompanyMembership.count as jest.Mock).mockResolvedValue(2);
      jest.spyOn(CardsService, 'getDefaultCardForCompany').mockResolvedValue({
        id: 'card_1',
        status: 'active',
        displayName: 'Main Card',
        maskedPan: '**** **** **** 1234',
        brand: 'visa',
        cardholderName: 'Anna Andersson',
        artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
      });
      jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockResolvedValue({
        spent: 380000,
        limit: 500000,
        remaining: 120000,
        utilizationPercent: 76,
        currency: 'SEK',
        label: 'based on your set limit',
      });
      jest.spyOn(TransactionService, 'getTransactionPreviewForCompany').mockResolvedValue({
        items: [
          {
            id: 'txn_1',
            description: 'Coffee purchase',
            amount: 45,
            createdAt: '2026-04-10T10:16:05.000Z',
            merchantUrl: 'https://app.qred.example.com/transactions/txn_1',
          },
        ],
        remainingTransactions: 3,
      });

      const result = await getDashboardForUser('user_1', 3);

      expect(result).toEqual({
        company: {
          value: {
            id: 'cmp_1',
            name: 'Company AB',
            hasMoreCompanies: true,
          },
        },
        card: {
          value: {
            id: 'card_1',
            status: 'active',
            artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
          },
        },
        spend: {
          value: {
            used: 3800,
            total: 5000,
            currency: 'SEK',
          },
        },
        transactions: {
          value: {
            items: [
              {
                id: 'txn_1',
                description: 'Coffee purchase',
                amount: 45,
                createdAt: '2026-04-10T10:16:05.000Z',
                merchantUrl: 'https://app.qred.example.com/transactions/txn_1',
              },
            ],
          },
        },
        viewMore: {
          value: {
            remainingTransactions: 3,
          },
        },
      });
    });

    it('returns partial data with section errors when one dependency fails', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValue({
        id: 'mem_1',
        companyId: 'cmp_1',
        isSelected: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        company: { id: 'cmp_1', name: 'Company AB' },
      });
      (UserCompanyMembership.count as jest.Mock).mockResolvedValue(1);
      jest
        .spyOn(CardsService, 'getDefaultCardForCompany')
        .mockRejectedValue(new Error('Card service unavailable'));
      jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockResolvedValue({
        spent: 50000,
        limit: 100000,
        remaining: 50000,
        utilizationPercent: 50,
        currency: 'SEK',
        label: 'based on your set limit',
      });
      jest.spyOn(TransactionService, 'getTransactionPreviewForCompany').mockResolvedValue({
        items: [],
        remainingTransactions: 0,
      });

      const result = await getDashboardForUser('user_1', 3);

      expect(result?.company.value).toEqual({
        id: 'cmp_1',
        name: 'Company AB',
        hasMoreCompanies: false,
      });
      expect(result?.card.error).toBe('Card service unavailable');
      expect(result?.spend.value).toEqual({
        used: 500,
        total: 1000,
        currency: 'SEK',
      });
      expect(result?.transactions.value).toEqual({ items: [] });
      expect(result?.viewMore.value).toEqual({ remainingTransactions: 0 });
    });

    it('returns null when user has no company memberships', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValue(null);

      const result = await getDashboardForUser('user_1', 3);

      expect(result).toBeNull();
    });

    it('uses latest membership when no selected company exists', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValue({
        id: 'mem_latest',
        companyId: 'cmp_2',
        isSelected: false,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        company: { id: 'cmp_2', name: 'Company XYZ' },
      });
      (UserCompanyMembership.count as jest.Mock).mockResolvedValue(2);
      jest.spyOn(CardsService, 'getDefaultCardForCompany').mockResolvedValue({
        id: 'card_1',
        status: 'active',
        displayName: 'Main Card',
        maskedPan: '**** **** **** 1234',
        brand: 'visa',
        cardholderName: 'Anna Andersson',
        artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
      });
      jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockResolvedValue({
        spent: 100000,
        limit: 200000,
        remaining: 100000,
        utilizationPercent: 50,
        currency: 'SEK',
        label: 'based on your set limit',
      });
      jest.spyOn(TransactionService, 'getTransactionPreviewForCompany').mockResolvedValue({
        items: [],
        remainingTransactions: 0,
      });

      const result = await getDashboardForUser('user_1', 3);

      expect(UserCompanyMembership.findOne).toHaveBeenCalledTimes(1);
      expect(UserCompanyMembership.update).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error('Expected dashboard result');
      }
      expect(result.company.value?.id).toBe('cmp_2');
    });
  });
});
