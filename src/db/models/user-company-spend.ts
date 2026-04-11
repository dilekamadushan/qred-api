import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import type { User } from './user';
import type { Company } from './company';

export class UserCompanySpend extends Model<
  InferAttributes<UserCompanySpend>,
  InferCreationAttributes<UserCompanySpend>
> {
  declare id: string;
  declare userId: ForeignKey<User['id']>;
  declare companyId: ForeignKey<Company['id']>;
  declare limitMinor: number;
  declare remainingMinor: number;
  declare currency: string;
  declare updatedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
}

export function initUserCompanySpendModel(sequelize: Sequelize): typeof UserCompanySpend {
  UserCompanySpend.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
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
      limitMinor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      remainingMinor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
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
      tableName: 'user_company_spends',
      indexes: [
        {
          name: 'user_company_spend_unique_idx',
          unique: true,
          fields: ['userId', 'companyId'],
        },
      ],
    }
  );

  return UserCompanySpend;
}
