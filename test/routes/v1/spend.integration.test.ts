import request from 'supertest';
import app from '../../../src/app';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';
import { uuid } from '../../../src/db/seed/seed';
import { UserCompanySpend } from '../../../src/db/models';
import { sharedDbCircuitBreaker } from '../../../src/services/circuitBreaker.service';

const companyId = uuid.cmp1;
const endpoint = `/api/v1/companies/${companyId}/remaining-spend`;

describe('routes', () => {
  describe('GET /api/v1/companies/:companyId/remaining-spend', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await setupTestDb();
    });

    beforeEach(async () => {
      await clearTestDatabase();
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
      await sharedDbCircuitBreaker.reset();
      jest.restoreAllMocks();
    });

    describe('when remaining spend exists', () => {
      it('should return remaining spend details for the company and authenticated user', async () => {
        await addTestData({
          users: [
            {
              id: uuid.anna,
              email: 'anna.andersson@qred.example.com',
              username: 'anna',
              firstName: 'Anna',
              lastName: 'Andersson',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          companies: [
            {
              id: companyId,
              name: 'Test Company',
              legalName: 'Test Company AB',
              logoUrl: '',
              creditLimitMinor: 1000000,
              currency: 'SEK',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          spends: [
            {
              id: 'spend_1',
              userId: uuid.anna,
              companyId,
              limitMinor: 500000,
              remainingMinor: 120000,
              currency: 'SEK',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        });

        const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          spent: 380000,
          limit: 500000,
          remaining: 120000,
          utilizationPercent: 76,
          currency: 'SEK',
          label: 'based on your set limit',
        });
      });
    });

    it('should return 404 if no spend data exists', async () => {
      const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.code).toBe('remaining_spend_not_found');
    });

    describe('when error happens', () => {
      describe('when throttled', () => {
        it('returns 429', async () => {
          const authHeader = 'Bearer spend-rate-limit';

          for (let index = 0; index < 10; index += 1) {
            await request(app).get(endpoint).set('Authorization', authHeader);
          }

          const res = await request(app).get(endpoint).set('Authorization', authHeader);

          expect(res.status).toBe(429);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.headers['retry-after']).toBeDefined();
          expect(res.body.code).toBe('rate_limited');
        });
      });

      describe('when circuit breaker is open', () => {
        it('returns 503 when circuit breaker is open', async () => {
          await sharedDbCircuitBreaker.updateOptions({
            errorThresholdPercentage: 50,
            volumeThreshold: 2,
            resetTimeout: 5000,
          });
          jest.spyOn(UserCompanySpend, 'findOne').mockRejectedValue(new Error('db unavailable'));

          await request(app).get(endpoint).set('Authorization', 'Bearer spend-breaker');
          await request(app).get(endpoint).set('Authorization', 'Bearer spend-breaker');

          const res = await request(app).get(endpoint).set('Authorization', 'Bearer spend-breaker');

          expect(res.status).toBe(503);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.body.code).toBe('service_unavailable');
        });
      });

      describe('when db error occurs', () => {
        it('should return 500 Internal Server Error', async () => {
          jest.spyOn(UserCompanySpend, 'findOne').mockRejectedValue(new Error('unexpected error'));

          const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');
          expect(res.status).toBe(500);
          expect(res.headers['content-type']).toContain('application/problem+json');
          expect(res.body.code).toBe('internal_server_error');
        });
      });
    });
  });
});
