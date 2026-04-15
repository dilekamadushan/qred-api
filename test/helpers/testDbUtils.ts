import {
  Card,
  Company,
  Invoice,
  Transaction,
  User,
  UserCompanyMembership,
  UserCompanySpend,
} from '../../src/db/models';
import { sequelize } from '../../src/db/sequelize';

export async function clearTestDatabase() {
  await Transaction.destroy({ where: {} });
  await Invoice.destroy({ where: {} });
  await Card.destroy({ where: {} });
  await UserCompanySpend.destroy({ where: {} });
  await UserCompanyMembership.destroy({ where: {} });
  await User.destroy({ where: {} });
  await Company.destroy({ where: {} });
}

import type { InferCreationAttributes } from 'sequelize';
// Removed duplicate type imports to avoid TS2300 errors

type AddTestDataArgs = {
  users?: InferCreationAttributes<User>[];
  companies?: InferCreationAttributes<Company>[];
  memberships?: InferCreationAttributes<UserCompanyMembership>[];
  cards?: InferCreationAttributes<Card>[];
  invoices?: InferCreationAttributes<Invoice>[];
  transactions?: InferCreationAttributes<Transaction>[];
  spends?: InferCreationAttributes<UserCompanySpend>[];
};

export async function addTestData({
  users = [],
  companies = [],
  memberships = [],
  cards = [],
  invoices = [],
  transactions = [],
  spends = [],
}: AddTestDataArgs) {
  await Company.bulkCreate(companies);
  await User.bulkCreate(users);
  await UserCompanyMembership.bulkCreate(memberships);
  await Card.bulkCreate(cards);
  await Invoice.bulkCreate(invoices);
  await Transaction.bulkCreate(transactions);
  await UserCompanySpend.bulkCreate(spends);
}

export async function setupTestDb() {
  await sequelize.sync({ force: true });
}
