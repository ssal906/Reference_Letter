// models/recommendation.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Recommendation extends Model {
    static associate(models) {
      Recommendation.belongsTo(models.User, {
        as: 'fromUser',
        foreignKey: 'fromUserId',
      });
      Recommendation.belongsTo(models.User, {
        as: 'toUser',
        foreignKey: 'toUserId',
      });
    }
  }

  Recommendation.init(
    {
      fromUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      toUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Recommendation',
      tableName: 'recommendation', // 단수 테이블명 유지
      timestamps: true,
      paranoid: true,
    }
  );

  return Recommendation;
};
