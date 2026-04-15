import request from 'supertest';
import app from '../../../src/app';
import { UserCompanyMembership } from '../../../src/db/models';
import { sharedDbCircuitBreaker } from '../../../src/services/circuitBreaker.service';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';
import { uuid } from '../../../src/db/seed/seed';

const userId = uuid.anna;

const testUser = {
  id: userId,
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cmpAlpha = {
  id: 'cmp-alpha',
  name: 'Alpha Corp',
  legalName: 'Alpha Corp Sverige AB',
  logoUrl: 'https://cdn.example.com/alpha.png',
  creditLimitMinor: 500000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cmpBeta = {
  id: 'cmp-beta',
  name: 'Beta Corp',
  legalName: 'Beta Corp Sverige AB',
  logoUrl: 'https://cdn.example.com/beta.png',
  creditLimitMinor: 750000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cmpGamma = {
  id: 'cmp-gamma',
  name: 'Gamma Corp',
  legalName: 'Gamma Corp Sverige AB',
  logoUrl: 'https://cdn.example.com/gamma.png',
  creditLimitMinor: 300000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memAlpha = {
  id: 'mem-alpha',
  userId,
  companyId: cmpAlpha.id,
  role: 'owner' as const,
  isSelected: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memBeta = {
  id: 'mem-beta',
  userId,
  companyId: cmpBeta.id,
  role: 'member' as const,
  isSelected: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const memGamma = {
  id: 'mem-gamma',
  userId,
  companyId: cmpGamma.id,
  role: 'member' as const,
  isSelected: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const endpoint = '/api/v1/companies';

describe('routes', () => {
  describe('GET /api/v1/companies', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await setupTestDb();
    });

    beforeEach(async () => {
      await clearTestDatabase();
      await addTestData({
        users: [testUser],
        companies: [cmpAlpha, cmpBeta, cmpGamma],
        memberships: [memAlpha, memBeta, memGamma],
      });
      await sharedDbCircuitBreaker.reset();
      await sharedDbCircuitBreaker.updateOptions({
        timeout: 2500,
        errorThresholdPercentage: 100,
        resetTimeout: 5000,
        volumeThreshold: 1000,
      });
      jest.restoreAllMocks();
    });

    afterEach(async () => {
      await clearTestDatabase();
      await sharedDbCircuitBreaker.reset();
    });

    describe('basic retrieval', () => {
      it('returns all companies for the authenticated user', async () => {
        const res = await request(app).get(endpoint).set('Authorization', 'Bearer companies-basic');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.body).toHaveProperty('data.items');
        expect(Array.isArray(res.body.data.items)).toBe(true);
        expect(res.body.data.items).toHaveLength(3);
        expect(res.body).toHaveProperty('data.page.hasMore');
        expect(res.body).toHaveProperty('data.page.pageSize');
        expect(res.body).toHaveProperty('links.self');
      });

      it('response items contain correct CompanySummary fields', async () => {
        const res = await request(app).get(endpoint).set('Authorization', 'Bearer companies-shape');

        expect(res.status).toBe(200);
        const item = res.body.data.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('legalName');
        expect(item).toHaveProperty('isSelected');
        expect(item).toHaveProperty('logoUrl');
      });

      it('returns empty list when user has no companies', async () => {
        await clearTestDatabase();
        await addTestData({ users: [testUser] });

        const res = await request(app).get(endpoint).set('Authorization', 'Bearer companies-empty');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.page.hasMore).toBe(false);
      });
    });

    describe('filtering', () => {
      it('returns only selected company when isSelected=true', async () => {
        const res = await request(app)
          .get(`${endpoint}?isSelected=true`)
          .set('Authorization', 'Bearer companies-filter-selected');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].isSelected).toBe(true);
      });

      it('returns only unselected companies when isSelected=false', async () => {
        const res = await request(app)
          .get(`${endpoint}?isSelected=false`)
          .set('Authorization', 'Bearer companies-filter-unselected');

        expect(res.status).toBe(200);
        expect(res.body.data.items.every((c: { isSelected: boolean }) => !c.isSelected)).toBe(true);
      });

      it('filters by search term matching company name', async () => {
        const res = await request(app)
          .get(`${endpoint}?search=Beta`)
          .set('Authorization', 'Bearer companies-search-name');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].name).toContain('Beta');
      });

      it('filters by search term matching legalName', async () => {
        const res = await request(app)
          .get(`${endpoint}?search=Gamma%20Corp%20Sverige`)
          .set('Authorization', 'Bearer companies-search-legal');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].legalName).toContain('Gamma');
      });

      it('returns empty list when search matches nothing', async () => {
        const res = await request(app)
          .get(`${endpoint}?search=zzznomatch`)
          .set('Authorization', 'Bearer companies-search-none');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
      });
    });

    describe('sorting', () => {
      it('sorts by name ASC by default', async () => {
        const res = await request(app)
          .get(`${endpoint}?pageSize=10`)
          .set('Authorization', 'Bearer companies-sort-default');

        expect(res.status).toBe(200);
        const names = res.body.data.items.map((c: { name: string }) => c.name);
        expect(names).toEqual([...names].sort());
      });

      it('sorts by legalName ASC when sortBy=legalName', async () => {
        const res = await request(app)
          .get(`${endpoint}?sortBy=legalName&pageSize=10`)
          .set('Authorization', 'Bearer companies-sort-legal');

        expect(res.status).toBe(200);
        const legalNames = res.body.data.items.map((c: { legalName: string }) => c.legalName);
        expect(legalNames).toEqual([...legalNames].sort());
      });

      it('sorts by isSelected DESC (selected first) when sortBy=isSelected', async () => {
        const res = await request(app)
          .get(`${endpoint}?sortBy=isSelected&pageSize=10`)
          .set('Authorization', 'Bearer companies-sort-selected');

        expect(res.status).toBe(200);
        const isSelectedValues = res.body.data.items.map(
          (c: { isSelected: boolean }) => c.isSelected
        );
        // Selected (true) should come before unselected (false)
        expect(isSelectedValues[0]).toBe(true);
      });
    });

    describe('pagination', () => {
      it('respects pageSize and sets hasMore=true when more exist', async () => {
        const res = await request(app)
          .get(`${endpoint}?pageSize=1`)
          .set('Authorization', 'Bearer companies-page-size');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.page.hasMore).toBe(true);
        expect(res.body.data.page.nextCursor).toBeTruthy();
        expect(res.body.links.next).toContain('cursor=');
      });

      it('follows cursor to retrieve next page with different item', async () => {
        const firstPage = await request(app)
          .get(`${endpoint}?pageSize=1`)
          .set('Authorization', 'Bearer companies-cursor-1');

        expect(firstPage.status).toBe(200);
        const cursor = firstPage.body.data.page.nextCursor;
        expect(cursor).toBeTruthy();

        const secondPage = await request(app)
          .get(`${endpoint}?pageSize=1&cursor=${encodeURIComponent(cursor)}`)
          .set('Authorization', 'Bearer companies-cursor-2');

        expect(secondPage.status).toBe(200);
        expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
      });

      it('cursor is stable across all 3 pages', async () => {
        const ids: string[] = [];
        let cursor: string | undefined;

        for (let page = 0; page < 3; page++) {
          const url = cursor
            ? `${endpoint}?pageSize=1&cursor=${encodeURIComponent(cursor)}`
            : `${endpoint}?pageSize=1`;
          const res = await request(app)
            .get(url)
            .set('Authorization', `Bearer companies-pages-${page}`);

          expect(res.status).toBe(200);
          ids.push(res.body.data.items[0].id);
          cursor = res.body.data.page.nextCursor;
        }

        // All 3 pages return distinct companies
        expect(new Set(ids).size).toBe(3);
      });

      it('last page has hasMore=false and no nextCursor', async () => {
        const res = await request(app)
          .get(`${endpoint}?pageSize=100`)
          .set('Authorization', 'Bearer companies-last-page');

        expect(res.status).toBe(200);
        expect(res.body.data.page.hasMore).toBe(false);
        expect(res.body.data.page.nextCursor).toBeNull();
        expect(res.body.links.next).toBeNull();
      });

      it('returns 200 when invalid cursor is provided', async () => {
        const invalidCursor = 'not-a-valid-base64';
        const res = await request(app)
          .get(`${endpoint}?cursor=${invalidCursor}`)
          .set('Authorization', 'Bearer companies-invalid-cursor');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/json; charset=utf-8');
        expect(res.body.data.items).toHaveLength(3);
      });
    });

    describe('error handling', () => {
      it('returns 401 when no Authorization header is provided', async () => {
        const res = await request(app).get(endpoint);

        expect(res.status).toBe(401);
      });

      it('returns 429 when rate limited', async () => {
        const authHeader = 'Bearer companies-rate-limit';
        for (let i = 0; i < 10; i++) {
          await request(app).get(endpoint).set('Authorization', authHeader);
        }
        const res = await request(app).get(endpoint).set('Authorization', authHeader);

        expect(res.status).toBe(429);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.headers['retry-after']).toBeDefined();
        expect(res.body.code).toBe('rate_limited');
      });

      it('returns 503 when circuit breaker is open', async () => {
        await sharedDbCircuitBreaker.updateOptions({
          errorThresholdPercentage: 50,
          volumeThreshold: 2,
          resetTimeout: 5000,
        });
        jest.spyOn(UserCompanyMembership, 'findAll').mockRejectedValue(new Error('db unavailable'));

        await request(app).get(endpoint).set('Authorization', 'Bearer companies-breaker');
        await request(app).get(endpoint).set('Authorization', 'Bearer companies-breaker');
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer companies-breaker');

        expect(res.status).toBe(503);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.body.code).toBe('service_unavailable');
      });

      it('returns 500 when DB throws an unexpected error', async () => {
        jest
          .spyOn(UserCompanyMembership, 'findAll')
          .mockRejectedValueOnce(new Error('unexpected error'));

        const res = await request(app).get(endpoint).set('Authorization', 'Bearer companies-500');

        expect(res.status).toBe(500);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.body.code).toBe('internal_server_error');
      });
    });
  });
  describe('PATCH /api/v1/user/company-selection', () => {
    const patchEndpoint = '/api/v1/user/company-selection';

    beforeEach(async () => {
      await clearTestDatabase();
      await addTestData({
        users: [testUser],
        companies: [cmpAlpha, cmpBeta],
        memberships: [memAlpha, { ...memBeta, id: 'mem-beta-patch' }],
      });
      await sharedDbCircuitBreaker.reset();
      await sharedDbCircuitBreaker.updateOptions({
        timeout: 2500,
        errorThresholdPercentage: 100,
        resetTimeout: 5000,
        volumeThreshold: 1000,
      });
      jest.restoreAllMocks();
    });

    it('returns 200 and switches the selected company', async () => {
      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-ok')
        .send({ companyId: cmpBeta.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when companyId is not in user memberships', async () => {
      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-nocompany')
        .send({ companyId: 'cmp-does-not-exist' });

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.code).toBe('company_membership_not_found');
    });

    it('returns 400 when body is missing companyId', async () => {
      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-bad')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app).patch(patchEndpoint).send({ companyId: cmpBeta.id });

      expect(res.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      const authHeader = 'Bearer companies-patch-ratelimit';
      for (let i = 0; i < 10; i++) {
        await request(app)
          .patch(patchEndpoint)
          .set('Authorization', authHeader)
          .send({ companyId: cmpAlpha.id });
      }
      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', authHeader)
        .send({ companyId: cmpAlpha.id });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('rate_limited');
    });

    it('returns 503 when circuit breaker is open', async () => {
      await sharedDbCircuitBreaker.updateOptions({
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        resetTimeout: 5000,
      });
      jest.spyOn(UserCompanyMembership, 'update').mockRejectedValue(new Error('db unavailable'));

      await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-breaker')
        .send({ companyId: cmpBeta.id });
      await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-breaker')
        .send({ companyId: cmpBeta.id });
      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-breaker')
        .send({ companyId: cmpBeta.id });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('service_unavailable');
    });

    it('returns 500 when DB throws an unexpected error', async () => {
      jest
        .spyOn(UserCompanyMembership, 'update')
        .mockRejectedValueOnce(new Error('unexpected db error'));

      const res = await request(app)
        .patch(patchEndpoint)
        .set('Authorization', 'Bearer companies-patch-500')
        .send({ companyId: cmpBeta.id });

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('internal_server_error');
    });
  });
});
