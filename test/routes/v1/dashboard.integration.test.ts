import request from 'supertest';
import app from '../../../src/app';
import { Card, Transaction, UserCompanySpend } from '../../../src/db/models';
import * as CardsService from '../../../src/services/cards.service';
import * as TransactionService from '../../../src/services/transactions.service';
import { DbCircuitOpenError } from '../../../src/common/errors/appHttpError';
import { sharedDbCircuitBreaker } from '../../../src/services/circuitBreaker.service';
import { addTestData, clearTestDatabase, setupTestDb } from '../../helpers/testDbUtils';
import { uuid } from '../../../src/db/seed/seed';

const userId = uuid.anna;
const companyId = 'cmp-dashboard-1';
const endpoint = '/api/v1/dashboard';

const testUser = {
  id: userId,
  email: 'dashboard@example.com',
  username: 'dash-user',
  firstName: 'Dash',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testCompany = {
  id: companyId,
  name: 'Dashboard Company',
  legalName: 'Dashboard Company AB',
  logoUrl: 'https://cdn.qred.example.com/company-logos/cmp-dashboard-1.png',
  creditLimitMinor: 500000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testMembership = {
  id: 'mem-dashboard-1',
  userId,
  companyId,
  role: 'owner' as const,
  isSelected: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testCard = {
  id: 'card-dashboard-1',
  companyId,
  userId,
  displayName: 'Main Card',
  maskedPan: '**** **** **** 1234',
  brand: 'visa' as const,
  cardholderName: 'Dash User',
  artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
  status: 'active' as const,
  isDefault: true,
  activatedAt: new Date(),
  blockedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const spend = {
  id: `${userId}-${companyId}`,
  userId,
  companyId,
  limitMinor: 500000,
  remainingMinor: 250000,
  currency: 'SEK',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const transactions = [
  {
    id: 'txn-dashboard-1',
    companyId,
    cardId: testCard.id,
    userId,
    createdAt: new Date('2026-04-10T10:16:05.000Z'),
    merchantName: 'Coffee Shop',
    description: 'Coffee purchase',
    category: 'coffee',
    amountMinor: 4500,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn-dashboard-1',
    updatedAt: new Date(),
  },
  {
    id: 'txn-dashboard-2',
    companyId,
    cardId: testCard.id,
    userId,
    createdAt: new Date('2026-04-09T10:16:05.000Z'),
    merchantName: 'Lunch Bar',
    description: 'Lunch',
    category: 'food',
    amountMinor: 12000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn-dashboard-2',
    updatedAt: new Date(),
  },
  {
    id: 'txn-dashboard-3',
    companyId,
    cardId: testCard.id,
    userId,
    createdAt: new Date('2026-04-08T10:16:05.000Z'),
    merchantName: 'Taxi',
    description: 'Taxi',
    category: 'travel',
    amountMinor: 30000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn-dashboard-3',
    updatedAt: new Date(),
  },
];

describe('GET /api/v1/dashboard', () => {
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
      spends: [spend],
      transactions,
    });
    await sharedDbCircuitBreaker.reset();
    jest.restoreAllMocks();
  });

  describe('successful response', () => {
    it('returns aggregated dashboard response', async () => {
      const response = await request(app)
        .get(`${endpoint}?transactionPreviewLimit=2`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.company.value.id).toBe(companyId);
      expect(response.body.data.card.value.id).toBe(testCard.id);
      expect(response.body.data.spend.value.currency).toBe('SEK');
      expect(response.body.data.transactions.value.items).toHaveLength(2);
      expect(response.body.data.viewMore.value.remainingTransactions).toBe(1);
      expect(response.body.data).not.toHaveProperty('invoice');
    });

    it('returns 404 when no selected company exists for the authenticated user', async () => {
      await clearTestDatabase();
      await addTestData({
        users: [testUser],
      });

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('selected_company_not_found');
      expect(response.body.detail).toBe('No selected company found for the authenticated user.');
    });
  });

  describe('partial failures', () => {
    it('returns partial data when one section fails', async () => {
      jest.spyOn(Card, 'findOne').mockRejectedValue(new Error('card db error'));

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.card.error).toBe('Failed to load default card data.');
      expect(response.body.data.spend.value).toBeDefined();
      expect(response.body.data.transactions.value.items).toBeDefined();
      expect(response.body.data.viewMore.value).toBeDefined();
    });

    it('returns partial data when two sections fail', async () => {
      jest.spyOn(UserCompanySpend, 'findOne').mockRejectedValue(new Error('spend db error'));
      jest.spyOn(Transaction, 'findAll').mockRejectedValue(new Error('transactions db error'));

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.company.value).toBeDefined();
      expect(response.body.data.card.value).toBeDefined();
      expect(response.body.data.spend.error).toBe('Failed to load spend data.');
      expect(response.body.data.transactions.error).toBe(
        'Failed to load transaction preview data.'
      );
      expect(response.body.data.viewMore.error).toBe('Failed to load transaction preview data.');
    });

    it('returns 503 when card, spend, and transactions all fail', async () => {
      jest.spyOn(Card, 'findOne').mockRejectedValue(new Error('card db error'));
      jest.spyOn(UserCompanySpend, 'findOne').mockRejectedValue(new Error('spend db error'));
      jest.spyOn(Transaction, 'findAll').mockRejectedValue(new Error('transactions db error'));

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(503);
      expect(response.body.code).toBe('service_unavailable');
      expect(response.body.detail).toBe(
        'Dashboard data is temporarily unavailable because all core sections failed. Please retry shortly.'
      );
    });

    it('returns partial data when a dependency responds with rate limited error', async () => {
      jest
        .spyOn(CardsService, 'getDefaultCardForCompany')
        .mockRejectedValue(new Error('rate limited'));

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.company.value).toBeDefined();
      expect(response.body.data.card.error).toBe('rate limited');
      expect(response.body.data.spend.value).toBeDefined();
      expect(response.body.data.transactions.value.items).toBeDefined();
      expect(response.body.data.viewMore.value).toBeDefined();
    });

    it('returns partial data when a dependency circuit breaker is open', async () => {
      jest
        .spyOn(TransactionService, 'getTransactionPreviewForCompany')
        .mockRejectedValue(new DbCircuitOpenError());

      const response = await request(app).get(endpoint).set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.company.value).toBeDefined();
      expect(response.body.data.card.value).toBeDefined();
      expect(response.body.data.spend.value).toBeDefined();
      expect(response.body.data.transactions.error).toBe('database_circuit_breaker_open');
      expect(response.body.data.viewMore.error).toBe('database_circuit_breaker_open');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limited', async () => {
      for (let index = 0; index < 12; index += 1) {
        await request(app).get(endpoint).set('Authorization', 'Bearer dashboard-rate-limit');
      }

      const response = await request(app)
        .get(endpoint)
        .set('Authorization', 'Bearer dashboard-rate-limit');

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('rate_limited');
    });
  });

  describe('validation errors', () => {
    it('returns 400 for preview limit below min', async () => {
      const response = await request(app)
        .get(`${endpoint}?transactionPreviewLimit=0`)
        .set('Authorization', 'Bearer test-token');
      expect(response.status).toBe(400);
    });

    it('returns 400 for preview limit above max', async () => {
      const response = await request(app)
        .get(`${endpoint}?transactionPreviewLimit=100`)
        .set('Authorization', 'Bearer test-token');
      expect(response.status).toBe(400);
    });

    it('returns 400 for non-numeric preview limit', async () => {
      const response = await request(app)
        .get(`${endpoint}?transactionPreviewLimit=abc`)
        .set('Authorization', 'Bearer test-token');
      expect(response.status).toBe(400);
    });
  });
});
