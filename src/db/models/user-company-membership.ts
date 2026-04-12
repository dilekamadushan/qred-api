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
import type { User } from './user';

export class UserCompanyMembership extends Model<
  InferAttributes<UserCompanyMembership>,
  InferCreationAttributes<UserCompanyMembership>
> {
  declare id: string;
  declare userId: ForeignKey<User['id']>;
  declare companyId: ForeignKey<Company['id']>;
  declare role: 'owner' | 'member';
  declare isSelected: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare company?: NonAttribute<Company>;
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
      isSelected: {
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
        // Enforce only one selected membership
        {
          unique: true,
          fields: ['userId'],
          where: { isSelected: true },
          name: 'unique_selected_membership_per_user',
        },
      ],
    }
  );

  return UserCompanyMembership;
}
