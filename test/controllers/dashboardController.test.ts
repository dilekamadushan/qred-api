import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../../src/common/constants';
import { getDashboard } from '../../src/controllers/dashboardController';
import { DbCircuitOpenError } from '../../src/services/circuitBreaker.service';
import * as DashboardService from '../../src/services/dashboard.service';

const mockRequest = (
  query: Record<string, unknown> = {},
  user: { userId: string } = { userId: 'test-user-id' }
): Request =>
  ({
    query,
    user,
    originalUrl: '/api/v1/dashboard',
  }) as unknown as Request;

const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('dashboardController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('returns 200 and dashboard data when service succeeds', async () => {
      const data = {
        company: { value: { id: 'cmp_1', name: 'Company AB', hasMoreCompanies: true } },
        card: {
          value: { id: 'card_1', status: 'active', artworkUrl: 'https://cdn.example.com/a' },
        },
        spend: { value: { used: 1000, total: 5000, currency: 'SEK' } },
        transactions: { value: { items: [] } },
        viewMore: { value: { remainingTransactions: 0 } },
      };

      jest
        .spyOn(DashboardService, 'getDashboardForUser')
        .mockResolvedValue(
          data as Awaited<ReturnType<typeof DashboardService.getDashboardForUser>>
        );

      const req = mockRequest({ transactionPreviewLimit: '5' });
      const res = mockResponse();

      await getDashboard(req, res);

      expect(DashboardService.getDashboardForUser).toHaveBeenCalledWith('test-user-id', 5);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({ data });
    });

    it('returns 404 when selected company is not found', async () => {
      jest.spyOn(DashboardService, 'getDashboardForUser').mockResolvedValue(null);

      const req = mockRequest();
      const res = mockResponse();

      await getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.type).toHaveBeenCalledWith('application/problem+json');
      // @ts-expect-error mock property is added by jest
      const payload = res.json.mock.calls[0][0];
      expect(payload.code).toBe('selected_company_not_found');
    });

    it('returns 503 when circuit breaker is open', async () => {
      jest
        .spyOn(DashboardService, 'getDashboardForUser')
        .mockRejectedValue(new DbCircuitOpenError());

      const req = mockRequest();
      const res = mockResponse();

      await expect(getDashboard(req, res)).rejects.toBeInstanceOf(DbCircuitOpenError);
    });

    it('calls next(error) for unexpected failures', async () => {
      const error = new Error('unexpected');
      jest.spyOn(DashboardService, 'getDashboardForUser').mockRejectedValue(error);

      const req = mockRequest();
      const res = mockResponse();

      await expect(getDashboard(req, res)).rejects.toThrow('unexpected');
    });
  });
});
