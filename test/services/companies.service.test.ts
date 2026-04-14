import { UserCompanyMembership } from '../../src/db/models/user-company-membership';
import * as CompaniesService from '../../src/services/companies.service';
import * as LogUtils from '../../src/common/utils/logUtils';
import { DbCircuitOpenError, InternalServerError } from '../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../src/services/circuitBreaker.service';
import { encodeCursor } from '../../src/common/utils/pagination';

jest.mock('../../src/db/models/user-company-membership');
jest.mock('../../src/db/models/company');

function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    userId: 'user_123',
    companyId: 'cmp_1',
    isSelected: false,
    company: {
      id: 'cmp_1',
      name: 'Alpha Corp',
      legalName: 'Alpha Corp Sverige',
      logoUrl: 'https://cdn.example.com/alpha.png',
    },
    ...overrides,
  };
}

describe('CompaniesService', () => {
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logErrorSpy = jest.spyOn(LogUtils, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getCompaniesForUser ────────────────────────────────────────────────────

  describe('getCompaniesForUser', () => {
    describe('when memberships exist', () => {
      it('returns mapped company summaries', async () => {
        const membership = makeMembership({ isSelected: true });
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([membership]);

        const result = await CompaniesService.getCompaniesForUser('user_123');

        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({
          id: 'cmp_1',
          name: 'Alpha Corp',
          legalName: 'Alpha Corp Sverige',
          isSelected: true,
          logoUrl: 'https://cdn.example.com/alpha.png',
        });
        expect(result.page.hasMore).toBe(false);
        expect(result.page.nextCursor).toBeNull();
      });

      it('returns empty items when user has no memberships', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        const result = await CompaniesService.getCompaniesForUser('user_123');

        expect(result.items).toHaveLength(0);
        expect(result.page.hasMore).toBe(false);
      });
    });

    describe('filtering', () => {
      it('passes isSelected filter to the query', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123', { isSelected: true });

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        expect(findAllArg.where).toMatchObject({ userId: 'user_123', isSelected: true });
      });

      it('passes search term into company include where', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123', { search: 'alpha' });

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        const companyInclude = findAllArg.include[0];
        expect(companyInclude.where).toBeDefined();
      });
    });

    describe('sorting', () => {
      it('sorts by name ASC by default', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123');

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        const firstOrder = findAllArg.order[0];
        expect(firstOrder).toContain('ASC');
      });

      it('sorts isSelected DESC when sortBy=isSelected', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123', { sortBy: 'isSelected' });

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        expect(findAllArg.order[0]).toEqual(['isSelected', 'DESC']);
        expect(findAllArg.order[1]).toEqual(['companyId', 'ASC']);
      });
    });

    describe('pagination', () => {
      it('sets hasMore=true and returns a nextCursor when more items exist', async () => {
        const memberships = [
          makeMembership({
            companyId: 'cmp_1',
            company: { id: 'cmp_1', name: 'Alpha Corp', legalName: 'Alpha Corp AB', logoUrl: '' },
          }),
          makeMembership({
            companyId: 'cmp_2',
            company: { id: 'cmp_2', name: 'Beta Corp', legalName: 'Beta Corp AB', logoUrl: '' },
          }),
        ];
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce(memberships);

        const result = await CompaniesService.getCompaniesForUser('user_123', { pageSize: 1 });

        expect(result.page.hasMore).toBe(true);
        expect(result.page.nextCursor).toBeTruthy();
        expect(result.items).toHaveLength(1);
      });

      it('appends cursor clause when cursor is provided', async () => {
        const cursor = encodeCursor({ sortField: 'name', sortValue: 'Alpha Corp', id: 'cmp_1' });
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123', { cursor });

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        // Combined where should use Op.and
        const whereKeys = Object.getOwnPropertySymbols(findAllArg.where);
        expect(whereKeys.length).toBeGreaterThan(0);
      });

      it('respects configured pageSize', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockResolvedValueOnce([]);

        await CompaniesService.getCompaniesForUser('user_123', { pageSize: 25 });

        const findAllArg = (UserCompanyMembership.findAll as jest.Mock).mock.calls[0][0];
        expect(findAllArg.limit).toBe(26); // pageSize + 1
      });
    });

    describe('error handling', () => {
      it('logs and throws InternalServerError when DB fails', async () => {
        (UserCompanyMembership.findAll as jest.Mock).mockRejectedValueOnce(new Error('db error'));

        await expect(CompaniesService.getCompaniesForUser('user_123')).rejects.toBeInstanceOf(
          InternalServerError
        );

        expect(logErrorSpy).toHaveBeenCalledWith(
          'CompaniesService',
          expect.stringContaining('Error querying companies for userId: user_123'),
          expect.any(Error)
        );
      });

      describe('when circuit breaker execution fails', () => {
        it('rethrows DbCircuitOpenError', async () => {
          const error = new DbCircuitOpenError();
          jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(error);

          await expect(CompaniesService.getCompaniesForUser('user_123')).rejects.toBeInstanceOf(
            DbCircuitOpenError
          );
        });

        it('propagates non-circuit errors', async () => {
          jest
            .spyOn(sharedDbCircuitBreaker, 'execute')
            .mockRejectedValueOnce(new Error('breaker failure'));

          await expect(CompaniesService.getCompaniesForUser('user_123')).rejects.toThrow(
            'breaker failure'
          );
        });
      });
    });
  });

  // ─── selectCompanyForUser ───────────────────────────────────────────────────

  describe('selectCompanyForUser', () => {
    it('returns true and performs two updates when membership exists', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValueOnce({ id: 'mem-1' });
      (UserCompanyMembership.update as jest.Mock).mockResolvedValue([1]);

      const result = await CompaniesService.selectCompanyForUser('user_123', 'cmp_1');

      expect(result).toBe(true);
      expect(UserCompanyMembership.update).toHaveBeenCalledTimes(2);
      // First call deselects all
      expect((UserCompanyMembership.update as jest.Mock).mock.calls[0][0]).toEqual({
        isSelected: false,
      });
      // Second call selects the target
      expect((UserCompanyMembership.update as jest.Mock).mock.calls[1][0]).toEqual({
        isSelected: true,
      });
    });

    it('returns false when membership is not found', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockResolvedValueOnce(null);

      const result = await CompaniesService.selectCompanyForUser('user_123', 'cmp_999');

      expect(result).toBe(false);
      expect(UserCompanyMembership.update).not.toHaveBeenCalled();
    });

    it('logs and throws InternalServerError when DB fails', async () => {
      (UserCompanyMembership.findOne as jest.Mock).mockRejectedValueOnce(new Error('db error'));

      await expect(
        CompaniesService.selectCompanyForUser('user_123', 'cmp_1')
      ).rejects.toBeInstanceOf(InternalServerError);

      expect(logErrorSpy).toHaveBeenCalledWith(
        'CompaniesService',
        expect.stringContaining('Error querying companies for userId: user_123'),
        expect.any(Error)
      );
    });

    describe('when circuit breaker execution fails', () => {
      it('rethrows DbCircuitOpenError', async () => {
        const error = new DbCircuitOpenError();
        jest.spyOn(sharedDbCircuitBreaker, 'execute').mockRejectedValueOnce(error);

        await expect(
          CompaniesService.selectCompanyForUser('user_123', 'cmp_1')
        ).rejects.toBeInstanceOf(DbCircuitOpenError);
      });

      it('propagates non-circuit errors', async () => {
        jest
          .spyOn(sharedDbCircuitBreaker, 'execute')
          .mockRejectedValueOnce(new Error('breaker failure'));

        await expect(CompaniesService.selectCompanyForUser('user_123', 'cmp_1')).rejects.toThrow(
          'breaker failure'
        );
      });
    });
  });
});
