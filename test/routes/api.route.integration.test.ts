import request from 'supertest';
import app from '../../src/app';

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
});
