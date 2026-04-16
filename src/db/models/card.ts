import type {
  CreationOptional,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';

import type { Company } from './company';
import type { CardStatus } from '../../common/types/types';
import { CARD_STATUS } from '../../common/constants';

export const cardBrands = ['visa', 'mastercard'] as const;

export class Card extends Model<InferAttributes<Card>, InferCreationAttributes<Card>> {
  declare id: string;
  declare companyId: ForeignKey<Company['id']>;
  declare userId: string;
  declare displayName: string;
  declare maskedPan: string;
  declare brand: (typeof cardBrands)[number];
  declare cardholderName: string;
  declare artworkUrl: string;
  declare status: CardStatus;
  declare isDefault: boolean;
  declare activatedAt: Date | null;
  declare blockedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCardModel(sequelize: Sequelize): typeof Card {
  Card.init(
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
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      maskedPan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      brand: {
        type: DataTypes.ENUM(...cardBrands),
        allowNull: false,
      },
      cardholderName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      artworkUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'https://example.com/card-artwork.png',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CARD_STATUS)),
        allowNull: false,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      activatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      blockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: 'cards',
      indexes: [
        {
          name: 'cards_company_idx',
          fields: ['companyId'],
        },
        {
          name: 'cards_user_idx',
          fields: ['userId'],
        },
        {
          name: 'cards_default_per_user_company_idx',
          unique: true,
          fields: ['companyId', 'userId'],
          where: { isDefault: true },
        },
        // Removed unique constraint on companyId and userId to allow multiple cards per user per company
        {
          name: 'cards_company_status_idx',
          fields: ['companyId', 'status'],
        },
        {
          name: 'cards_default_per_company_idx',
          unique: true,
          fields: ['companyId'],
          where: {
            isDefault: true,
          },
        },
      ],
    }
  );

  return Card;
}
