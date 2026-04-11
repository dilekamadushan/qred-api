import type { Sequelize } from 'sequelize';

import { Card, initCardModel } from './card';
import { Company, initCompanyModel } from './company';
import { Invoice, initInvoiceModel } from './invoice';
import { Transaction, initTransactionModel } from './transaction';
import { User, initUserModel } from './user';
import { UserCompanyMembership, initUserCompanyMembershipModel } from './user-company-membership';
import { UserCompanySpend, initUserCompanySpendModel } from './user-company-spend';

let initialized = false;

export function initModels(sequelize: Sequelize) {
  if (initialized) {
    return {
      User,
      Company,
      UserCompanyMembership,
      Card,
      Invoice,
      Transaction,
      UserCompanySpend,
    };
  }

  initCompanyModel(sequelize);
  initUserModel(sequelize);
  initUserCompanyMembershipModel(sequelize);
  initCardModel(sequelize);
  initInvoiceModel(sequelize);
  initTransactionModel(sequelize);
  initUserCompanySpendModel(sequelize);

  User.belongsTo(Company, {
    foreignKey: 'selectedCompanyId',
    as: 'selectedCompany',
  });

  User.belongsToMany(Company, {
    through: UserCompanyMembership,
    foreignKey: 'userId',
    otherKey: 'companyId',
    as: 'companies',
  });

  Company.belongsToMany(User, {
    through: UserCompanyMembership,
    foreignKey: 'companyId',
    otherKey: 'userId',
    as: 'users',
  });

  User.hasMany(UserCompanyMembership, {
    foreignKey: 'userId',
    as: 'memberships',
  });

  Company.hasMany(UserCompanyMembership, {
    foreignKey: 'companyId',
    as: 'memberships',
  });

  Company.hasMany(Card, {
    foreignKey: 'companyId',
    as: 'cards',
  });
  Card.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company',
  });

  Company.hasMany(Invoice, {
    foreignKey: 'companyId',
    as: 'invoices',
  });
  Invoice.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company',
  });

  Company.hasMany(Transaction, {
    foreignKey: 'companyId',
    as: 'transactions',
  });
  Transaction.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company',
  });

  Card.hasMany(Transaction, {
    foreignKey: 'cardId',
    as: 'transactions',
  });
  Transaction.belongsTo(Card, {
    foreignKey: 'cardId',
    as: 'card',
  });

  initialized = true;

  return {
    User,
    Company,
    UserCompanyMembership,
    Card,
    Invoice,
    Transaction,
    UserCompanySpend,
  };
}

export { Card, Company, Invoice, Transaction, User, UserCompanyMembership, UserCompanySpend };
