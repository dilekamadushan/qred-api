import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import type { Card } from './card';
import type { Company } from './company';

export const transactionDirections = ['debit', 'credit'] as const;
export const transactionStatuses = ['pending', 'booked', 'declined', 'reversed'] as const;

export class Transaction extends Model<
  InferAttributes<Transaction>,
  InferCreationAttributes<Transaction>
> {
  declare id: string;
  declare companyId: ForeignKey<Company['id']>;
  declare cardId: ForeignKey<Card['id']>;
  declare createdAt: Date;
  declare merchantName: string;
  declare description: string;
  declare category: string;
  declare amountMinor: number;
  declare currency: string;
  declare direction: (typeof transactionDirections)[number];
  declare status: (typeof transactionStatuses)[number];
  declare merchantUrl: string;
  declare updatedAt: CreationOptional<Date>;
}

export function initTransactionModel(sequelize: Sequelize): typeof Transaction {
  Transaction.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      cardId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'cards',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      merchantName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amountMinor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'SEK',
      },
      direction: {
        type: DataTypes.ENUM(...transactionDirections),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...transactionStatuses),
        allowNull: false,
      },
      merchantUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'transactions',
      updatedAt: 'updatedAt',
      createdAt: false,
      indexes: [
        {
          name: 'transactions_company_created_at_idx',
          fields: ['companyId', 'createdAt'],
        },
        {
          name: 'transactions_company_status_created_at_idx',
          fields: ['companyId', 'status', 'createdAt'],
        },
        {
          name: 'transactions_company_amount_idx',
          fields: ['companyId', 'amountMinor'],
        },
        {
          name: 'transactions_company_merchant_idx',
          fields: ['companyId', 'merchantName'],
        },
        {
          name: 'transactions_card_created_at_idx',
          fields: ['cardId', 'createdAt'],
        },
      ],
    }
  );

  return Transaction;
}
