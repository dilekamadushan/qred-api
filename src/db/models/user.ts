import type {
  CreationOptional,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';

import type { Company } from './company';
import type { UserCompanyMembership } from './user-company-membership';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string;
  declare email: string;
  declare username: string;
  declare firstName: string;
  declare lastName: string;
  declare selectedCompanyId: ForeignKey<Company['id']> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare selectedCompany?: NonAttribute<Company | null>;
  declare companies?: NonAttribute<Company[]>;
  declare memberships?: NonAttribute<UserCompanyMembership[]>;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      selectedCompanyId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
      tableName: 'users',
      indexes: [
        {
          name: 'users_selected_company_idx',
          fields: ['selectedCompanyId'],
        },
        {
          name: 'users_username_idx',
          unique: true,
          fields: ['username'],
        },
      ],
    }
  );

  return User;
}
