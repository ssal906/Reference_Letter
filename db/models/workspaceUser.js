// models/workspaceUser.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkspaceUser extends Model {
    static associate(models) {
      WorkspaceUser.belongsTo(models.Workspace, {
        as: 'workspace',
        foreignKey: 'workspaceId',
      });
      WorkspaceUser.belongsTo(models.User, {
        as: 'user',
        foreignKey: 'userId',
      });
      WorkspaceUser.belongsTo(models.WorkspaceRole, {
        as: 'role',
        foreignKey: 'workspaceRoleId',
      });

      // 추천서 역참조
      WorkspaceUser.hasMany(models.Recommendation, {
        as: 'fromRecommendations',
        foreignKey: 'fromWorkspaceUserId',
      });
      WorkspaceUser.hasMany(models.Recommendation, {
        as: 'toRecommendations',
        foreignKey: 'toWorkspaceUserId',
      });
    }
  }

  WorkspaceUser.init(
    {
      workspaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      workspaceRoleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'WorkspaceUser',
      tableName: 'workspaceUsers',
      timestamps: true,
      paranoid: true,
      // (workspaceId, userId) UNIQUE는 마이그레이션에서 처리
    }
  );

  return WorkspaceUser;
};
