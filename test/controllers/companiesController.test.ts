import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { HTTP_STATUS } from '../../src/common/constants';
import { DbCircuitOpenError } from '../../src/common/errors/appHttpError';
import { listCompanies, updateCompanySelection } from '../../src/controllers/companies.controller';
import * as CompaniesService from '../../src/services/companies.service';

const mockRequest = (
  query: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
  user: { userId: string } = { userId: 'test-user-id' },
  params: ParamsDictionary = {}
): Request =>
  ({
    params,
    query,
    body,
    user,
    protocol: 'http',
    get: (name: string) => (name.toLowerCase() === 'host' ? 'localhost:3000' : ''),
    originalUrl: '/api/v1/companies',
  }) as unknown as Request;

const mockResponse = (): Response => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('companiesController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── listCompanies ──────────────────────────────────────────────────────────

  describe('listCompanies', () => {
    const mockListData = {
      items: [
        {
          id: 'cmp_1',
          name: 'Company AB',
          legalName: 'Company AB Sverige',
          isSelected: true,
          logoUrl: 'https://cdn.example.com/logo.png',
        },
      ],
      page: { pageSize: 10, hasMore: false, nextCursor: null },
    };

    it('returns 200 with companies list and links', async () => {
      jest.spyOn(CompaniesService, 'getCompaniesForUser').mockResolvedValueOnce(mockListData);

      const req = mockRequest();
      const res = mockResponse();

      await listCompanies(req, res);

      expect(CompaniesService.getCompaniesForUser).toHaveBeenCalledWith('test-user-id', {
        search: undefined,
        pageSize: 10,
        sortBy: undefined,
        isSelected: undefined,
        cursor: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockListData,
          links: expect.objectContaining({
            self: expect.stringContaining('/api/v1/companies'),
            prev: null,
          }),
        })
      );
    });

    it('passes all query options to the service', async () => {
      jest.spyOn(CompaniesService, 'getCompaniesForUser').mockResolvedValueOnce({
        items: [],
        page: { pageSize: 5, hasMore: false, nextCursor: null },
      });

      const req = mockRequest({
        search: 'corp',
        pageSize: '5',
        sortBy: 'legalName',
        isSelected: 'true',
        cursor: 'abc123',
      });
      const res = mockResponse();

      await listCompanies(req, res);

      expect(CompaniesService.getCompaniesForUser).toHaveBeenCalledWith('test-user-id', {
        search: 'corp',
        pageSize: 5,
        sortBy: 'legalName',
        isSelected: true,
        cursor: 'abc123',
      });
    });

    it('returns next link when hasMore is true', async () => {
      jest.spyOn(CompaniesService, 'getCompaniesForUser').mockResolvedValueOnce({
        items: [mockListData.items[0]],
        page: { pageSize: 1, hasMore: true, nextCursor: 'cursor_xyz' },
      });

      const req = mockRequest({ pageSize: '1' });
      const res = mockResponse();

      await listCompanies(req, res);

      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.links.next).toContain('cursor=cursor_xyz');
    });

    it('propagates DbCircuitOpenError to middleware', async () => {
      jest
        .spyOn(CompaniesService, 'getCompaniesForUser')
        .mockRejectedValueOnce(new DbCircuitOpenError());

      await expect(listCompanies(mockRequest(), mockResponse())).rejects.toBeInstanceOf(
        DbCircuitOpenError
      );
    });

    it('propagates unexpected errors to middleware', async () => {
      jest
        .spyOn(CompaniesService, 'getCompaniesForUser')
        .mockRejectedValueOnce(new Error('unexpected'));

      await expect(listCompanies(mockRequest(), mockResponse())).rejects.toThrow('unexpected');
    });
  });

  // ─── updateCompanySelection ─────────────────────────────────────────────────

  describe('updateCompanySelection', () => {
    it('returns 200 with success=true when membership exists', async () => {
      jest.spyOn(CompaniesService, 'selectCompanyForUser').mockResolvedValueOnce(true);

      const req = mockRequest({}, { companyId: 'cmp_1' });
      const res = mockResponse();

      await updateCompanySelection(req, res);

      expect(CompaniesService.selectCompanyForUser).toHaveBeenCalledWith('test-user-id', 'cmp_1');
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('throws NotFoundError when membership is not found', async () => {
      jest.spyOn(CompaniesService, 'selectCompanyForUser').mockResolvedValueOnce(false);

      await expect(
        updateCompanySelection(mockRequest({}, { companyId: 'cmp_999' }), mockResponse())
      ).rejects.toMatchObject({
        status: HTTP_STATUS.NOT_FOUND,
        code: 'company_membership_not_found',
      });
    });

    it('propagates DbCircuitOpenError to middleware', async () => {
      jest
        .spyOn(CompaniesService, 'selectCompanyForUser')
        .mockRejectedValueOnce(new DbCircuitOpenError());

      await expect(
        updateCompanySelection(mockRequest({}, { companyId: 'cmp_1' }), mockResponse())
      ).rejects.toBeInstanceOf(DbCircuitOpenError);
    });

    it('propagates unexpected errors to middleware', async () => {
      jest
        .spyOn(CompaniesService, 'selectCompanyForUser')
        .mockRejectedValueOnce(new Error('unexpected'));

      await expect(
        updateCompanySelection(mockRequest({}, { companyId: 'cmp_1' }), mockResponse())
      ).rejects.toThrow('unexpected');
    });
  });
});
