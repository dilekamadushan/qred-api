import request from 'supertest';
import app from '../../../src/app';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';
import { uuid } from '../../../src/db/seed/seed';
import { Invoice } from '../../../src/db/models';

const companyId = uuid.cmp1;
const endpoint = `/api/v1/companies/${companyId}/invoices/latest`;

describe('routes', () => {
  describe('GET /api/v1/companies/:companyId/invoices/latest', () => {
    beforeAll(async () => {
      await setupTestDb();
    });

    beforeEach(async () => {
      await clearTestDatabase();
    });

    describe('when there is a due invoice', () => {
      it('should return the latest due invoice for the company', async () => {
        const invoice = {
          id: uuid.inv1,
          companyId,
          label: 'Test Invoice',
          dueDate: '2099-12-31',
          amountMinor: 10000,
          currency: 'SEK',
          status: 'due' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await addTestData({
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
          invoices: [invoice],
        });

        const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          label: invoice.label,
          dueDate: invoice.dueDate,
          amount: {
            amountMinor: invoice.amountMinor,
            currency: invoice.currency,
          },
        });
      });
    });

    it('should return 404 if there are no due invoices', async () => {
      const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');
      expect(res.status).toBe(404);
    });

    describe('when db error occurs', () => {
      beforeEach(() => {
        jest.spyOn(Invoice, 'findOne').mockRejectedValue(new Error('unexpected error'));
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return 500 Internal Server Error', async () => {
        const res = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');
        expect(res.status).toBe(500);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.body.code).toBe('internal_server_error');
      });
    });
  });
});
