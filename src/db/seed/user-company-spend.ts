import { UserCompanySpend } from '../models';

export const userCompanySpends = [
  {
    id: 'spend_usr_anna_cmp_123',
    userId: 'usr_anna',
    companyId: 'cmp_123',
    limitMinor: 500000,
    remainingMinor: 120000,
    currency: 'SEK',
    createdAt: new Date('2026-04-01T09:00:00Z'),
    updatedAt: new Date('2026-04-10T09:00:00Z'),
  },
  {
    id: 'spend_usr_anna_cmp_456',
    userId: 'usr_anna',
    companyId: 'cmp_456',
    limitMinor: 750000,
    remainingMinor: 400000,
    currency: 'SEK',
    createdAt: new Date('2026-04-01T09:00:00Z'),
    updatedAt: new Date('2026-04-10T09:00:00Z'),
  },
];
