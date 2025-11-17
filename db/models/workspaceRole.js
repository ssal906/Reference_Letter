// models/workspaceRole.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkspaceRole extends Model {
    static associate(models) {
      WorkspaceRole.belongsTo(models.Workspace, {
        as: 'workspace',
        foreignKey: 'workspaceId',
      });
      WorkspaceRole.hasMany(models.WorkspaceUser, {
        as: 'workspaceUsers',
        foreignKey: 'workspaceRoleId',
      });
    }
  }

  WorkspaceRole.init(
    {
      name: { type: DataTypes.STRING(191), allowNull: false },
      workspaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    },
    {
      sequelize,
      modelName: 'WorkspaceRole',
      tableName: 'workspaceRoles',
      timestamps: true,
      paranoid: true,
      // (workspaceId, name) UNIQUE는 마이그레이션에서 처리
    }
  );

  return WorkspaceRole;
};
