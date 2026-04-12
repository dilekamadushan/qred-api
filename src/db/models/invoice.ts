import type {
  CreationOptional,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';

import type { Company } from './company';

export const invoiceStatuses = ['due', 'paid'] as const;

export class Invoice extends Model<InferAttributes<Invoice>, InferCreationAttributes<Invoice>> {
  declare id: string;
  declare companyId: ForeignKey<Company['id']>;
  declare label: string;
  declare dueDate: string;
  declare amountMinor: number;
  declare currency: string;
  declare status: (typeof invoiceStatuses)[number];
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initInvoiceModel(sequelize: Sequelize): typeof Invoice {
  Invoice.init(
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
      label: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Invoice due',
      },
      dueDate: {
        type: DataTypes.DATEONLY,
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
      status: {
        type: DataTypes.ENUM(...invoiceStatuses),
        allowNull: false,
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
      tableName: 'invoices',
      indexes: [
        {
          name: 'invoices_company_due_date_idx',
          fields: ['companyId', 'dueDate'],
        },
        {
          name: 'invoices_company_status_idx',
          fields: ['companyId', 'status'],
        },
      ],
    }
  );

  return Invoice;
}
