import request from 'supertest';
import app from '../../../src/app';
import { sharedDbCircuitBreaker } from '../../../src/services/circuitBreaker.service';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';
import { uuid } from '../../../src/db/seed/seed';

const companyId = uuid.cmp1;
const userId = uuid.anna;
const cardId = uuid.card1;
const testCompany = {
  id: companyId,
  name: 'Test Company',
  legalName: 'Test Company AB',
  logoUrl: '',
  creditLimitMinor: 1000000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const testUser = {
  id: userId,
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const testMembership = {
  id: 'test-mem-1',
  userId,
  companyId,
  role: 'owner' as const,
  isSelected: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const testCard = {
  id: cardId,
  companyId,
  userId,
  displayName: 'Main Card',
  maskedPan: '**** **** **** 1234',
  brand: 'visa' as const,
  cardholderName: 'Test User',
  artworkUrl: 'https://example.com/card-artwork.png',
  status: 'active' as const,
  isDefault: true,
  activatedAt: new Date(),
  blockedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const testTransaction = {
  id: 'txn_1',
  companyId,
  cardId,
  userId,
  createdAt: new Date('2026-04-10T10:16:05.000Z'),
  merchantName: 'Coffee Shop',
  description: 'Coffee purchase',
  category: 'coffee',
  amountMinor: 1000,
  currency: 'SEK',
  direction: 'debit' as const,
  status: 'booked' as const,
  merchantUrl: 'https://merchant.com',
  updatedAt: new Date(),
};
const secondTransaction = {
  id: 'txn_2',
  companyId,
  cardId,
  userId,
  createdAt: new Date('2026-04-09T12:30:00.000Z'),
  merchantName: 'Lunch Bar',
  description: 'Lunch meal',
  category: 'food',
  amountMinor: 3000,
  currency: 'SEK',
  direction: 'debit' as const,
  status: 'pending' as const,
  merchantUrl: 'https://merchant.com/2',
  updatedAt: new Date(),
};
const thirdTransaction = {
  id: 'txn_3',
  companyId,
  cardId,
  userId,
  createdAt: new Date('2026-04-01T08:00:00.000Z'),
  merchantName: 'Refund Store',
  description: 'Refund',
  category: 'refund',
  amountMinor: 500,
  currency: 'SEK',
  direction: 'credit' as const,
  status: 'reversed' as const,
  merchantUrl: 'https://merchant.com/3',
  updatedAt: new Date(),
};

describe('routes', () => {
  describe('GET /v1/companies/:companyId/transactions', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await setupTestDb();
    });

    beforeEach(async () => {
      await clearTestDatabase();
      await addTestData({
        users: [testUser],
        companies: [testCompany],
        memberships: [testMembership],
        cards: [testCard],
        transactions: [testTransaction, secondTransaction, thirdTransaction],
      });
      await sharedDbCircuitBreaker.reset();
      jest.restoreAllMocks();
    });

    afterEach(async () => {
      await clearTestDatabase();
      await sharedDbCircuitBreaker.reset();
    });

    describe('basic retrieval', () => {
      it('returns transactions for a company', async () => {
        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/transactions`)
          .set('Authorization', 'Bearer integration-success-base');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.body).toHaveProperty('data.items');
        expect(Array.isArray(res.body.data.items)).toBe(true);
        expect(res.body.data.items[0]).toHaveProperty('id', testTransaction.id);
        expect(res.body).toHaveProperty('data.page.hasMore');
        expect(res.body).toHaveProperty('data.page.pageSize');
        expect(res.body).toHaveProperty('links.self');
      });
    });

    describe('filtering', () => {
      it('filters by status', async () => {
        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/transactions?status=pending`)
          .set('Authorization', 'Bearer integration-success-status');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].status).toBe('pending');
      });

      it('filters by date range', async () => {
        const res = await request(app)
          .get(
            `/api/v1/companies/${companyId}/transactions?dateFrom=2026-04-09&dateTo=2026-04-10&pageSize=10`
          )
          .set('Authorization', 'Bearer integration-success-daterange');

        expect(res.status).toBe(200);
        expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
        for (const item of res.body.data.items) {
          expect(item.createdAt >= '2026-04-09').toBe(true);
        }
      });
    });

    describe('search', () => {
      it('searches by merchant or description', async () => {
        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/transactions?search=coffee`)
          .set('Authorization', 'Bearer integration-success-search');

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].merchantName).toContain('Coffee');
      });
    });

    describe('sorting', () => {
      it('sorts by amount asc', async () => {
        const res = await request(app)
          .get(
            `/api/v1/companies/${companyId}/transactions?sortBy=amount&sortOrder=asc&pageSize=10`
          )
          .set('Authorization', 'Bearer integration-success-sort');

        expect(res.status).toBe(200);
        const amounts = res.body.data.items.map(
          (item: {
            amount: {
              amountMinor: number;
            };
          }) => item.amount.amountMinor
        );
        expect(amounts).toEqual([...amounts].sort((a: number, b: number) => a - b));
      });
    });

    describe('pagination', () => {
      it('returns nextCursor when paginated and supports cursor paging', async () => {
        const firstPage = await request(app)
          .get(`/api/v1/companies/${companyId}/transactions?pageSize=1`)
          .set('Authorization', 'Bearer integration-success-cursor');

        expect(firstPage.status).toBe(200);
        expect(firstPage.body.data.page.hasMore).toBe(true);
        expect(firstPage.body.data.page.nextCursor).toBeTruthy();

        const secondPage = await request(app)
          .get(
            `/api/v1/companies/${companyId}/transactions?pageSize=1&cursor=${encodeURIComponent(firstPage.body.data.page.nextCursor)}`
          )
          .set('Authorization', 'Bearer integration-success-cursor');

        expect(secondPage.status).toBe(200);
        expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
      });
    });

    describe('rate limiting', () => {
      it('returns 429 if rate limited', async () => {
        for (let i = 0; i < 11; i++) {
          await request(app)
            .get(`/api/v1/companies/${companyId}/transactions`)
            .set('Authorization', 'Bearer integration-success');
        }
        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/transactions`)
          .set('Authorization', 'Bearer integration-success');
        expect(res.status).toBe(429);
        expect(res.body.code).toBe('rate_limited');
      });
    });
  });
});
