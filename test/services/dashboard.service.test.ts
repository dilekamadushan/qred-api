import { getDashboardForUser } from '../../src/services/dashboard.service';
import { NotFoundError, ServiceUnavailableError } from '../../src/common/errors/appHttpError';
import * as LogUtils from '../../src/common/utils/logUtils';
import * as CompaniesService from '../../src/services/companies.service';
import * as CardsService from '../../src/services/cards.service';
import * as SpendService from '../../src/services/spend.service';
import * as TransactionService from '../../src/services/transactions.service';

describe('dashboard.service', () => {
  let logWarnSpy: jest.SpyInstance;

  const selectedCompany = {
    companyId: 'cmp_1',
    section: {
      value: {
        id: 'cmp_1',
        name: 'Company AB',
        hasMoreCompanies: true,
      },
    },
  };

  const activeCard = {
    id: 'card_1',
    status: 'active' as const,
    displayName: 'Main Card',
    maskedPan: '**** **** **** 1234',
    brand: 'visa' as const,
    cardholderName: 'Anna Andersson',
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    logWarnSpy = jest.spyOn(LogUtils, 'logWarn').mockImplementation(() => {});
    jest.spyOn(CompaniesService, 'getSelectedCompanyForUser').mockResolvedValue(selectedCompany);
    jest.spyOn(CardsService, 'getDefaultCardForCompany').mockResolvedValue(activeCard);
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
          category: 'office_supplies',
          direction: 'debit',
          status: 'booked',
          merchantName: 'Coffee Shop',
          amount: {
            amountMinor: 4500,
            currency: 'SEK',
          },
          createdAt: '2026-04-10T10:16:05.000Z',
          merchantUrl: 'https://app.qred.example.com/transactions/txn_1',
        },
      ],
      remainingTransactions: 3,
    });
  });

  describe('getDashboardForUser', () => {
    describe('when dependencies succeed', () => {
      it('returns aggregated dashboard data', async () => {
        const result = await getDashboardForUser('user_1', 3);

        expect(CompaniesService.getSelectedCompanyForUser).toHaveBeenCalledWith('user_1');
        expect(CardsService.getDefaultCardForCompany).toHaveBeenCalledWith('cmp_1', 'user_1');
        expect(SpendService.getRemainingSpendForCompany).toHaveBeenCalledWith('user_1', 'cmp_1');
        expect(TransactionService.getTransactionPreviewForCompany).toHaveBeenCalledWith(
          'cmp_1',
          'user_1',
          3
        );

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
                  direction: 'debit',
                  merchantName: 'Coffee Shop',
                  category: 'office_supplies',
                  status: 'booked',
                  amount: {
                    amountMinor: 4500,
                    currency: 'SEK',
                  },
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

      it('maps closed cards to blocked status', async () => {
        jest.spyOn(CardsService, 'getDefaultCardForCompany').mockResolvedValueOnce({
          ...activeCard,
          status: 'closed',
        });

        const result = await getDashboardForUser('user_1', 3);

        expect(result.card).toEqual({
          value: {
            id: 'card_1',
            status: 'blocked',
            artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
          },
        });
      });
    });

    describe('when selected company retrieval fails', () => {
      it('rethrows selected company not found errors', async () => {
        jest.spyOn(CompaniesService, 'getSelectedCompanyForUser').mockRejectedValueOnce(
          new NotFoundError({
            detail: 'No selected company found for the authenticated user.',
            code: 'selected_company_not_found',
          })
        );

        await expect(getDashboardForUser('user_1', 3)).rejects.toMatchObject({
          status: 404,
          code: 'selected_company_not_found',
        });
      });

      it('rethrows unexpected selected-company errors', async () => {
        jest
          .spyOn(CompaniesService, 'getSelectedCompanyForUser')
          .mockRejectedValueOnce(new Error('selected company query failed'));

        await expect(getDashboardForUser('user_1', 3)).rejects.toThrow(
          'selected company query failed'
        );
      });
    });

    describe('when card section fails', () => {
      it('returns null card value for not found card', async () => {
        jest.spyOn(CardsService, 'getDefaultCardForCompany').mockRejectedValueOnce(
          new NotFoundError({
            detail: 'No default card exists for company cmp_1.',
            code: 'default_card_not_found',
            title: 'default_card_not_found',
          })
        );

        const result = await getDashboardForUser('user_1', 3);

        expect(result.card).toEqual({ value: null });
      });

      it('returns card section error for unexpected failures', async () => {
        jest
          .spyOn(CardsService, 'getDefaultCardForCompany')
          .mockRejectedValueOnce(new Error('Card service unavailable'));

        const result = await getDashboardForUser('user_1', 3);

        expect(result.card).toEqual({ error: 'Card service unavailable' });
        expect(result.spend).toEqual({
          value: {
            used: 3800,
            total: 5000,
            currency: 'SEK',
          },
        });
      });
    });

    describe('when spend section fails', () => {
      it('returns null spend value for not found spend data', async () => {
        jest.spyOn(SpendService, 'getRemainingSpendForCompany').mockRejectedValueOnce(
          new NotFoundError({
            detail: 'No remaining spend data found for company cmp_1.',
            code: 'remaining_spend_not_found',
          })
        );

        const result = await getDashboardForUser('user_1', 3);

        expect(result.spend).toEqual({ value: null });
      });

      it('returns spend section error for unexpected failures', async () => {
        jest
          .spyOn(SpendService, 'getRemainingSpendForCompany')
          .mockRejectedValueOnce(new Error('Spend service unavailable'));

        const result = await getDashboardForUser('user_1', 3);

        expect(result.spend).toEqual({ error: 'Spend service unavailable' });
      });
    });

    describe('when transactions section fails', () => {
      it('surfaces the same error for transactions and viewMore sections', async () => {
        jest
          .spyOn(TransactionService, 'getTransactionPreviewForCompany')
          .mockRejectedValueOnce(new Error('Failed to load transaction preview data.'));

        const result = await getDashboardForUser('user_1', 3);

        expect(result.transactions).toEqual({
          error: 'Failed to load transaction preview data.',
        });
        expect(result.viewMore).toEqual({
          error: 'Failed to load transaction preview data.',
        });
      });
    });

    describe('when all core sections fail', () => {
      it('throws ServiceUnavailableError and logs exact service-level warning', async () => {
        jest
          .spyOn(CardsService, 'getDefaultCardForCompany')
          .mockRejectedValueOnce(new Error('card db error'));
        jest
          .spyOn(SpendService, 'getRemainingSpendForCompany')
          .mockRejectedValueOnce(new Error('spend db error'));
        jest
          .spyOn(TransactionService, 'getTransactionPreviewForCompany')
          .mockRejectedValueOnce(new Error('transactions db error'));

        await expect(getDashboardForUser('user_1', 3)).rejects.toBeInstanceOf(
          ServiceUnavailableError
        );

        expect(logWarnSpy).toHaveBeenCalledWith(
          'DashboardService',
          'All core sections failed to load. Returning service unavailable error.'
        );
      });
    });
  });
});
