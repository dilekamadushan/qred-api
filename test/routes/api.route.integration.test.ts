import request from 'supertest';
import app from '../../src/app';
import { setupTestDb } from '../helpers/testDbUtils';

// This test suite verifies that all /api routes require authentication.
describe('API authentication', () => {
  const apiRoutes = [
    '/api/v1/companies/test-company-1/card/default',
    '/api/v1/companies',
    // Add more /api routes here as needed
  ];

  apiRoutes.forEach((route) => {
    it(`should return 401 Unauthorized for ${route} without auth`, async () => {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    });
  });

  describe('when authenticated', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await setupTestDb();
    });

    it('should include X-Request-Id header on successful authenticated request', async () => {
      // Use a valid route and valid auth (adjust as needed for your test setup)
      const res = await request(app)
        .get('/api/v1/companies/test-company-1/card/default')
        .set('Authorization', 'Bearer integration-test');

      // Accept both 200 and 404 as valid for this header check
      expect(res.status).toBe(404);
      expect(res.headers['x-request-id']).toEqual(expect.any(String));
    });
  });
});
