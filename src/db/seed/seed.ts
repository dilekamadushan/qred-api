import {
  Card,
  Company,
  Invoice,
  Transaction,
  User,
  UserCompanyMembership,
  UserCompanySpend,
} from '../models';

// Predefined UUIDs for consistency
export const uuid = {
  anna: '00000000-0000-0000-0000-000000000001',
  cmp1: '11111111-1111-1111-1111-111111111111',
  cmp2: '22222222-2222-2222-2222-222222222222',
  mem_anna_cmp1: '33333333-3333-3333-3333-333333333333',
  mem_anna_cmp2: '44444444-4444-4444-4444-444444444444',
  card1: '55555555-5555-5555-5555-555555555555',
  card2: '66666666-6666-6666-6666-666666666666',
  card3: '77777777-7777-7777-7777-777777777777',
  inv1: '88888888-8888-8888-8888-888888888888',
  inv2: '99999999-9999-9999-9999-999999999999',
  txn1: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  txn2: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  txn3: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  txn4: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  txn5: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  txn6: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
};

const users = [
  {
    id: uuid.anna,
    email: 'anna.andersson@qred.example.com',
    username: 'anna',
    firstName: 'Anna',
    lastName: 'Andersson',
    selectedCompanyId: uuid.cmp1,
  },
];

const companies = [
  {
    id: uuid.cmp1,
    name: 'Company AB',
    legalName: 'Company AB Sverige',
    logoUrl: `https://cdn.qred.example.com/company-logos/${uuid.cmp1}.png`,
    creditLimitMinor: 500000,
    currency: 'SEK',
  },
  {
    id: uuid.cmp2,
    name: 'Company XYZ',
    legalName: 'Company XYZ Sverige',
    logoUrl: `https://cdn.qred.example.com/company-logos/${uuid.cmp2}.png`,
    creditLimitMinor: 750000,
    currency: 'SEK',
  },
];

const memberships = [
  {
    id: uuid.mem_anna_cmp1,
    userId: uuid.anna,
    companyId: uuid.cmp1,
    role: 'owner' as const,
    isDefault: true,
  },
  {
    id: uuid.mem_anna_cmp2,
    userId: uuid.anna,
    companyId: uuid.cmp2,
    role: 'member' as const,
    isDefault: false,
  },
];

const cards = [
  {
    id: uuid.card1,
    companyId: uuid.cmp1,
    userId: uuid.anna,
    displayName: 'Main Card',
    maskedPan: '**** **** **** 1234',
    brand: 'visa' as const,
    cardholderName: 'Anna Andersson',
    artworkUrl: 'https://cdn.qred.example.com/card-artwork/visa.png',
    status: 'active' as const,
    isDefault: true,
    activatedAt: new Date('2026-04-01T09:00:00Z'),
    blockedAt: null,
  },
  {
    id: uuid.card2,
    companyId: uuid.cmp1,
    userId: uuid.anna,
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
    id: uuid.card3,
    companyId: uuid.cmp2,
    userId: uuid.anna,
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
    id: uuid.inv1,
    companyId: uuid.cmp1,
    label: 'Invoice due',
    dueDate: '2026-05-01',
    amountMinor: 125000,
    currency: 'SEK',
    status: 'due' as const,
    issuedAt: '2026-04-01',
    paidAt: null,
  },
  {
    id: uuid.inv2,
    companyId: uuid.cmp2,
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
    id: uuid.txn1,
    companyId: uuid.cmp1,
    cardId: uuid.card1,
    createdAt: new Date('2026-04-10T10:16:05Z'),
    merchantName: 'Espresso House',
    description: 'Coffee purchase',
    category: 'coffee',
    amountMinor: 4500,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn1}`,
  },
  {
    id: uuid.txn2,
    companyId: uuid.cmp1,
    cardId: uuid.card1,
    createdAt: new Date('2026-04-09T12:30:00Z'),
    merchantName: 'Lunch Bar',
    description: 'Lunch',
    category: 'food',
    amountMinor: 12000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn2}`,
  },
  {
    id: uuid.txn3,
    companyId: uuid.cmp1,
    cardId: uuid.card2,
    createdAt: new Date('2026-04-08T08:15:00Z'),
    merchantName: 'Taxi Stockholm',
    description: 'Taxi',
    category: 'travel',
    amountMinor: 30000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'booked' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn3}`,
  },
  {
    id: uuid.txn4,
    companyId: uuid.cmp1,
    cardId: uuid.card1,
    createdAt: new Date('2026-04-07T09:10:00Z'),
    merchantName: 'Office Depot',
    description: 'Office supplies',
    category: 'office',
    amountMinor: 87500,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'pending' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn4}`,
  },
  {
    id: uuid.txn5,
    companyId: uuid.cmp2,
    cardId: uuid.card3,
    createdAt: new Date('2026-04-06T15:45:00Z'),
    merchantName: 'Hotel Nord',
    description: 'Hotel booking',
    category: 'travel',
    amountMinor: 150000,
    currency: 'SEK',
    direction: 'debit' as const,
    status: 'declined' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn5}`,
  },
  {
    id: uuid.txn6,
    companyId: uuid.cmp2,
    cardId: uuid.card3,
    createdAt: new Date('2026-04-05T11:20:00Z'),
    merchantName: 'Refund Store',
    description: 'Refund',
    category: 'refund',
    amountMinor: 10000,
    currency: 'SEK',
    direction: 'credit' as const,
    status: 'reversed' as const,
    merchantUrl: `https://app.qred.example.com/transactions/${uuid.txn6}`,
  },
];

const userCompanySpends = [
  {
    id: uuid.anna + '-' + uuid.cmp1,
    userId: uuid.anna,
    companyId: uuid.cmp1,
    limitMinor: 500000,
    remainingMinor: 120000,
    currency: 'SEK',
    createdAt: new Date('2026-04-01T09:00:00Z'),
    updatedAt: new Date('2026-04-10T09:00:00Z'),
  },
  {
    id: uuid.anna + '-' + uuid.cmp2,
    userId: uuid.anna,
    companyId: uuid.cmp2,
    limitMinor: 750000,
    remainingMinor: 400000,
    currency: 'SEK',
    createdAt: new Date('2026-04-01T09:00:00Z'),
    updatedAt: new Date('2026-04-10T09:00:00Z'),
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
