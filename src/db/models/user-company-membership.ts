import type {
  CreationOptional,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';
import { DataTypes, Model } from 'sequelize';

import type { Company } from './company';
import type { User } from './user';

export class UserCompanyMembership extends Model<
  InferAttributes<UserCompanyMembership>,
  InferCreationAttributes<UserCompanyMembership>
> {
  declare id: string;
  declare userId: ForeignKey<User['id']>;
  declare companyId: ForeignKey<Company['id']>;
  declare role: 'owner' | 'member';
  declare isDefault: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserCompanyMembershipModel(sequelize: Sequelize): typeof UserCompanyMembership {
  UserCompanyMembership.init(
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
      role: {
        type: DataTypes.ENUM('owner', 'member'),
        allowNull: false,
        defaultValue: 'owner',
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: 'user_company_memberships',
      indexes: [
        {
          name: 'user_company_membership_unique_idx',
          unique: true,
          fields: ['userId', 'companyId'],
        },
        {
          name: 'user_company_memberships_company_idx',
          fields: ['companyId'],
        },
        // Enforce only one default membership
        {
          unique: true,
          fields: ['userId'],
          where: { isDefault: true },
          name: 'unique_default_membership_per_user',
        },
      ],
    }
  );

  return UserCompanyMembership;
}
