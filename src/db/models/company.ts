import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from 'sequelize';

import type { Card } from './card';
import type { Invoice } from './invoice';
import type { Transaction } from './transaction';
import type { User } from './user';
import type { UserCompanyMembership } from './user-company-membership';

export class Company extends Model<InferAttributes<Company>, InferCreationAttributes<Company>> {
  declare id: string;
  declare name: string;
  declare legalName: string;
  declare logoUrl: string;
  declare creditLimitMinor: number;
  declare currency: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare cards?: NonAttribute<Card[]>;
  declare invoices?: NonAttribute<Invoice[]>;
  declare transactions?: NonAttribute<Transaction[]>;
  declare users?: NonAttribute<User[]>;
  declare memberships?: NonAttribute<UserCompanyMembership[]>;
}

export function initCompanyModel(sequelize: Sequelize): typeof Company {
  Company.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      legalName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      logoUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      creditLimitMinor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'SEK',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'companies',
      indexes: [
        {
          name: 'companies_name_idx',
          fields: ['name'],
        },
        {
          name: 'companies_legal_name_idx',
          fields: ['legalName'],
        },
      ],
    }
  );

  return Company;
}
