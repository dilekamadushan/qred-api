import {
  Card,
  Company,
  Invoice,
  Transaction,
  User,
  UserCompanyMembership,
  UserCompanySpend,
} from '../models';
import { userCompanySpends } from './user-company-spend';

const users = [
  {
    id: 'usr_anna',
    email: 'anna.andersson@qred.example.com',
    username: 'anna',
    firstName: 'Anna',
    lastName: 'Andersson',
    selectedCompanyId: 'cmp_123',
  },
];

const companies = [
  {
    id: 'cmp_123',
    name: 'Company AB',
    legalName: 'Company AB Sverige',
    logoUrl: 'https://cdn.qred.example.com/company-logos/cmp_123.png',
    creditLimitMinor: 500000,
    currency: 'SEK',
  },
  {
    id: 'cmp_456',
    name: 'Company XYZ',
    legalName: 'Company XYZ Sverige',
    logoUrl: 'https://cdn.qred.example.com/company-logos/cmp_456.png',
    creditLimitMinor: 750000,
    currency: 'SEK',
  },
];

const memberships = [
  {
    id: 'mem_usr_anna_cmp_123',
    userId: 'usr_anna',
    companyId: 'cmp_123',
    role: 'owner' as const,
    isDefault: true,
  },
  {
    id: 'mem_usr_anna_cmp_456',
    userId: 'usr_anna',
    companyId: 'cmp_456',
    role: 'member' as const,
    isDefault: false,
  },
];

const cards = [
  {
    id: 'card_987',
    companyId: 'cmp_123',
    userId: 'usr_anna',
    displayName: 'Main Card',
    maskedPan: '**** **** **** 1234',
    brand: 'visa' as const,
    cardholderName: 'Anna Andersson', // Optionally: users[0].firstName + ' ' + users[0].lastName
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
    status: 'active' as const,
    isDefault: true,
    activatedAt: new Date('2026-04-01T09:00:00Z'),
    blockedAt: null,
  },
  {
    id: 'card_654',
    companyId: 'cmp_123',
    userId: 'usr_anna',
    displayName: 'Travel Card',
    maskedPan: '**** **** **** 5678',
    brand: 'mastercard' as const,
    cardholderName: 'Anna Andersson',
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/mastercard.png',
    status: 'blocked' as const,
    isDefault: false,
    activatedAt: new Date('2026-03-15T09:00:00Z'),
    blockedAt: new Date('2026-04-05T10:00:00Z'),
  },
  {
    id: 'card_321',
    companyId: 'cmp_456',
    userId: 'usr_anna',
    displayName: 'Main Card',
    maskedPan: '**** **** **** 4321',
    brand: 'visa' as const,
    cardholderName: 'Anna Andersson',
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
    status: 'pending_activation' as const,
    isDefault: true,
    activatedAt: null,
    blockedAt: null,
  },
];

const invoices = [
  {
    id: 'inv_456',
    companyId: 'cmp_123',
    label: 'Invoice due',
    dueDate: '2026-05-01',
    amountMinor: 125000,
    currency: 'SEK',
    status: 'due' as const,
    issuedAt: '2026-04-01',
    paidAt: null,
  },
  {
    id: 'inv_789',
    companyId: 'cmp_456',
    label: 'Invoice due',
    dueDate: '2026-04-15',
    amountMinor: 95000,
    currency: 'SEK',
    status: 'paid' as const,
    issuedAt: '2026-03-15',
    paidAt: new Date('2026-04-10T12:00:00Z'),
  },
];

const transactions = [
  {
    id: 'txn_001',
    companyId: 'cmp_123',
    cardId: 'card_987',
    createdAt: new Date('2026-04-10T10:16:05Z'),
    merchantName: 'Espresso House',
    description: 'Coffee purchase',
    category: 'coffee',
    amountMinor: 4500,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_001',
  },
  {
    id: 'txn_002',
    companyId: 'cmp_123',
    cardId: 'card_987',
    createdAt: new Date('2026-04-09T12:30:00Z'),
    merchantName: 'Lunch Bar',
    description: 'Lunch',
    category: 'food',
    amountMinor: 12000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_002',
  },
  {
    id: 'txn_003',
    companyId: 'cmp_123',
    cardId: 'card_654',
    createdAt: new Date('2026-04-08T08:15:00Z'),
    merchantName: 'Taxi Stockholm',
    description: 'Taxi',
    category: 'travel',
    amountMinor: 30000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_003',
  },
  {
    id: 'txn_004',
    companyId: 'cmp_123',
    cardId: 'card_987',
    createdAt: new Date('2026-04-07T09:10:00Z'),
    merchantName: 'Office Depot',
    description: 'Office supplies',
    category: 'office',
    amountMinor: 87500,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'pending' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_004',
  },
  {
    id: 'txn_005',
    companyId: 'cmp_456',
    cardId: 'card_321',
    createdAt: new Date('2026-04-06T15:45:00Z'),
    merchantName: 'Hotel Nord',
    description: 'Hotel booking',
    category: 'travel',
    amountMinor: 150000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'declined' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_005',
  },
  {
    id: 'txn_006',
    companyId: 'cmp_456',
    cardId: 'card_321',
    createdAt: new Date('2026-04-05T11:20:00Z'),
    merchantName: 'Refund Store',
    description: 'Refund',
    category: 'refund',
    amountMinor: 10000,
    currency: 'SEK',
    direction: 'credit' as const,
    status: 'reversed' as const,
    merchantUrl: 'https://app.qred.example.com/transactions/txn_006',
  },
];

export async function seedDatabase(options?: { force?: boolean }) {
  if (options?.force) {
    await Transaction.destroy({ where: {} });
    await Invoice.destroy({ where: {} });
    await Card.destroy({ where: {} });
    await UserCompanySpend.destroy({ where: {} });
    await UserCompanyMembership.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Company.destroy({ where: {} });
  } else {
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      return;
    }
  }

  await Company.bulkCreate(companies);
  await User.bulkCreate(users);
  await UserCompanyMembership.bulkCreate(memberships);
  await Card.bulkCreate(cards);
  await Invoice.bulkCreate(invoices);
  await Transaction.bulkCreate(transactions);
  await UserCompanySpend.bulkCreate(userCompanySpends);
}
