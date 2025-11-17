// models/workspace.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      // owner
      Workspace.belongsTo(models.User, {
        as: 'owner',
        foreignKey: 'userId',
      });

      // M:N members
      Workspace.belongsToMany(models.User, {
        as: 'members',
        through: models.WorkspaceUser,
        foreignKey: 'workspaceId',
        otherKey: 'userId',
      });

      // 1:N roles, 1:N membership rows
      Workspace.hasMany(models.WorkspaceRole, {
        as: 'roles',
        foreignKey: 'workspaceId',
      });
      Workspace.hasMany(models.WorkspaceUser, {
        as: 'workspaceUsers',
        foreignKey: 'workspaceId',
      });
    }
  }

  Workspace.init(
    {
      registrationNumber: { type: DataTypes.STRING(191), allowNull: true },
      name: { type: DataTypes.STRING(191), allowNull: false },
      ceoName: { type: DataTypes.STRING(191), allowNull: true },
      creatorName: { type: DataTypes.STRING(191), allowNull: true },
      address: { type: DataTypes.STRING(255), allowNull: true },
      homepage: { type: DataTypes.STRING(255), allowNull: true, validate: { isUrl: true } },
      phone: { type: DataTypes.STRING(50), allowNull: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Workspace',
      tableName: 'workspaces',
      timestamps: true,
      paranoid: true,
    }
  );

  return Workspace;
};
