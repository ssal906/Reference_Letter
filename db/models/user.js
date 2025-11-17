// models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 1) 한 사용자가 여러 워크스페이스를 "소유"
      User.hasMany(models.Workspace, {
        as: 'ownedWorkspaces',
        foreignKey: 'userId',
      });

      // 2) 워크스페이스 회원(M:N) — 중간 테이블 workspaceUsers
      User.belongsToMany(models.Workspace, {
        as: 'workspaces',
        through: models.WorkspaceUser,
        foreignKey: 'userId',
        otherKey: 'workspaceId',
      });

      // 3) 중간 엔티티 직접 접근(회원 레코드)
      User.hasMany(models.WorkspaceUser, {
        as: 'workspaceMemberships',
        foreignKey: 'userId',
      });

      // 4) 추천서(from/to) 접근은 WorkspaceUser 통해 연결
    }

    // 필요 시 비밀번호 비교 유틸(예: bcrypt.compare)
  }

  User.init(
    {
      email: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
        validate: { isEmail: true, len: [3, 191] },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { len: [8, 255] },
      },
      serialNumber: {
        type: DataTypes.STRING(191),
        allowNull: true, // MySQL의 UNIQUE는 NULL 중복 허용
        unique: true,
        validate: { len: [1, 191] },
      },
      nickname: {
        type: DataTypes.STRING(191),
        allowNull: true,
      },
      gender: {
        // 0: 미선택, 1: 남성, 2: 여성
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: { isIn: [[0, 1, 2]] },
      },
      birth: {
        // 문자열로 둘 계획이면 간단 패턴 체크(선택)
        type: DataTypes.STRING(32),
        allowNull: true,
        // validate: { is: /^\d{4}-\d{2}-\d{2}$/ }, // 원하면 활성화
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: { len: [3, 50] },
      },
      postCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      addressDetail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isUrl: true }, // URL만 허용하려면 유지
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      paranoid: true,
      defaultScope: {
        attributes: { exclude: ['password'] },
      },
      scopes: {
        withPassword: { attributes: { include: ['password'] } },
        withDeleted: { paranoid: false }, // soft-deleted 포함 조회
      },
      // 필요 시 indexes를 모델에도 중복 정의할 수 있으나,
      // 마이그레이션으로 관리하므로 생략 권장. :contentReference[oaicite:4]{index=4}
      hooks: {
        // 비밀번호 해시가 필요하면 활성화(옵션)
        // beforeCreate: async (user) => { if (user.password) user.password = await hash(user.password); },
        // beforeUpdate: async (user) => { if (user.changed('password')) user.password = await hash(user.password); },
      },
    }
  );

  return User;
};
