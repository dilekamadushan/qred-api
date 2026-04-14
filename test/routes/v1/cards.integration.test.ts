import request from 'supertest';
import app from '../../../src/app';
import { Card } from '../../../src/db/models/card';
import { sharedDbCircuitBreaker } from '../../../src/services/circuitBreaker.service';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';

const companyId = 'test-company-1';
import { uuid } from '../../../src/db/seed/seed';
const userId = uuid.anna;
const cardId = 'test-card-1';
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
const otherUser = {
  id: 'not-anna',
  email: 'not.anna@example.com',
  username: 'notanna',
  firstName: 'Not',
  lastName: 'Anna',
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
const otherMembership = {
  id: 'test-mem-2',
  userId: 'not-anna',
  companyId,
  role: 'member' as const,
  isSelected: false,
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

describe('routes', () => {
  describe('GET /v1/companies/:companyId/card/default', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await setupTestDb();
    });

    beforeEach(async () => {
      await clearTestDatabase();
      await addTestData({
        users: [testUser, otherUser],
        companies: [testCompany],
        memberships: [testMembership, otherMembership],
        cards: [testCard],
      });
      await sharedDbCircuitBreaker.reset();
      // Never open during normal tests
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
      jest.restoreAllMocks();
    });

    describe('when a default card exists for the authenticated user', () => {
      it('returns the default card for a company and user', async () => {
        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/card/default`)
          .set('Authorization', 'Bearer integration-success');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.body).toHaveProperty('id', cardId);
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('displayName');
        expect(res.body).toHaveProperty('maskedPan');
        expect(res.body).toHaveProperty('brand');
        expect(res.body).toHaveProperty('cardholderName');
        expect(res.body).toHaveProperty('artworkUrl');
      });
    });

    describe('when no default card exists', () => {
      it('returns 404', async () => {
        await Card.update({ isDefault: false }, { where: { companyId } });

        const res = await request(app)
          .get(`/api/v1/companies/${companyId}/card/default`)
          .set('Authorization', 'Bearer integration-not-found');

        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.body.code).toBe('default_card_not_found');
        expect(res.body.status).toBe(404);
      });
    });

    describe('when error happens', () => {
      describe('when throttled', () => {
        it('returns 429', async () => {
          const authHeader = 'Bearer integration-rate-limit';
          for (let index = 0; index < 10; index += 1) {
            await request(app)
              .get(`/api/v1/companies/${companyId}/card/default`)
              .set('Authorization', authHeader);
          }

          const res = await request(app)
            .get(`/api/v1/companies/${companyId}/card/default`)
            .set('Authorization', authHeader);

          expect(res.status).toBe(429);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.headers['retry-after']).toBeDefined();
          expect(res.body.code).toBe('rate_limited');
        });
      });

      describe('when circuit breaker is open', () => {
        it('returns 503 when circuit breaker is open', async () => {
          // Set breaker to open quickly for this test only
          await sharedDbCircuitBreaker.updateOptions({
            errorThresholdPercentage: 50,
            volumeThreshold: 2,
            resetTimeout: 5000,
          });
          jest.spyOn(Card, 'findOne').mockRejectedValue(new Error('db unavailable'));

          // Make enough requests to open the breaker
          await request(app)
            .get(`/api/v1/companies/${companyId}/card/default`)
            .set('Authorization', 'Bearer integration-breaker');
          await request(app)
            .get(`/api/v1/companies/${companyId}/card/default`)
            .set('Authorization', 'Bearer integration-breaker');
          const res = await request(app)
            .get(`/api/v1/companies/${companyId}/card/default`)
            .set('Authorization', 'Bearer integration-breaker');

          expect(res.status).toBe(503);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.body.code).toBe('service_unavailable');
        });
      });

      describe('when unexpected error happens', () => {
        it('returns 500', async () => {
          jest.spyOn(Card, 'findOne').mockRejectedValue(new Error('unexpected error'));

          const res = await request(app)
            .get(`/api/v1/companies/${companyId}/card/default`)
            .set('Authorization', 'Bearer integration-unexpected-error');

          expect(res.status).toBe(500);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.body.code).toBe('internal_server_error');
        });
      });
    });
  });
});
