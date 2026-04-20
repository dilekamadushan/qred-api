import { Op } from 'sequelize';
import { Company } from '../../../src/db/models/company';
import {
  buildCompanyIncludeWhereClause,
  buildCompanyQueryOptions,
  buildCursorClause,
  buildMembershipWhereClause,
  buildOrderClause,
  mapMembershipToSummary,
} from '../../../src/common/utils/companies';
import { decodeCursor } from '../../../src/common/utils/pagination';

describe('utils/companies', () => {
  describe('buildCompanyQueryOptions', () => {
    it('parses all query options correctly', () => {
      const result = buildCompanyQueryOptions({
        search: 'alpha',
        pageSize: '25',
        sortBy: 'legalName',
        isSelected: 'true',
        cursor: 'abc',
      });

      expect(result).toEqual({
        search: 'alpha',
        pageSize: 25,
        sortBy: 'legalName',
        isSelected: true,
        cursor: 'abc',
      });
    });

    it('defaults pageSize and parses boolean isSelected', () => {
      expect(buildCompanyQueryOptions({}).pageSize).toBe(10);
      expect(buildCompanyQueryOptions({ isSelected: true }).isSelected).toBe(true);
      expect(buildCompanyQueryOptions({ isSelected: false }).isSelected).toBe(false);
    });
  });

  describe('buildMembershipWhereClause', () => {
    it('builds where with only userId when isSelected is undefined', () => {
      expect(buildMembershipWhereClause('user_1', {})).toEqual({ userId: 'user_1' });
    });

    it('adds isSelected filter when present', () => {
      expect(buildMembershipWhereClause('user_1', { isSelected: false })).toEqual({
        userId: 'user_1',
        isSelected: false,
      });
    });
  });

  describe('buildCompanyIncludeWhereClause', () => {
    it('returns undefined for empty search', () => {
      expect(buildCompanyIncludeWhereClause()).toBeUndefined();
      expect(buildCompanyIncludeWhereClause('   ')).toBeUndefined();
    });

    it('returns like-based OR clause for search', () => {
      const clause = buildCompanyIncludeWhereClause('alpha') as Record<symbol, unknown>;
      const symbolKeys = Object.getOwnPropertySymbols(clause);
      expect(symbolKeys).toContain(Op.or);
    });
  });

  describe('buildCursorClause', () => {
    it('builds cursor clause for isSelected sort', () => {
      const clause = buildCursorClause({
        sortField: 'isSelected',
        sortValue: true,
        id: 'cmp_1',
      }) as Record<symbol, unknown>;

      const symbolKeys = Object.getOwnPropertySymbols(clause);
      expect(symbolKeys).toContain(Op.or);
    });

    it('builds cursor clause for name sort', () => {
      const clause = buildCursorClause({
        sortField: 'name',
        sortValue: 'Alpha',
        id: 'cmp_1',
      }) as Record<symbol, unknown>;

      const symbolKeys = Object.getOwnPropertySymbols(clause);
      expect(symbolKeys).toContain(Op.or);
    });
  });

  describe('buildOrderClause', () => {
    it('returns expected order for name', () => {
      expect(buildOrderClause('name')).toEqual([
        [{ model: Company, as: 'company' }, 'name', 'ASC'],
        ['companyId', 'ASC'],
      ]);
    });

    it('returns expected order for legalName', () => {
      expect(buildOrderClause('legalName')).toEqual([
        [{ model: Company, as: 'company' }, 'legalName', 'ASC'],
        ['companyId', 'ASC'],
      ]);
    });

    it('returns expected order for isSelected', () => {
      expect(buildOrderClause('isSelected')).toEqual([
        ['isSelected', 'DESC'],
        ['companyId', 'ASC'],
      ]);
    });
  });

  describe('mapMembershipToSummary', () => {
    it('maps membership shape to CompanySummary', () => {
      const summary = mapMembershipToSummary({
        companyId: 'cmp_1',
        isSelected: true,
        company: {
          id: 'cmp_1',
          name: 'Alpha',
          legalName: 'Alpha AB',
          logoUrl: 'https://cdn.example.com/a.png',
        },
      });

      expect(summary).toEqual({
        id: 'cmp_1',
        name: 'Alpha',
        legalName: 'Alpha AB',
        isSelected: true,
        logoUrl: 'https://cdn.example.com/a.png',
      });
    });
  });

  describe('cursor payload compatibility', () => {
    it('encodes and decodes expected cursor payload shape', () => {
      const encoded = Buffer.from(
        JSON.stringify({ sortField: 'name', sortValue: 'Alpha', id: 'cmp_1' })
      ).toString('base64');

      const decoded = decodeCursor<{
        sortField: string;
        sortValue: string | boolean;
        id: string;
      }>(encoded);

      expect(decoded).toEqual({ sortField: 'name', sortValue: 'Alpha', id: 'cmp_1' });
    });
  });
});
