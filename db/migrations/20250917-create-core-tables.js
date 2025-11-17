// migrations/20250917-create-core-tables.js
const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 공통 테이블 옵션
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    // 1) users
    await queryInterface.createTable(
      'users',
      {
        ...deletedAtCreate,
        email: {
          type: Sequelize.STRING(191), // utf8mb4 유니크 인덱스 안전 길이
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        serialNumber: {
          type: Sequelize.STRING(191),
          allowNull: true,
          unique: true,
        },
        nickname: {
          type: Sequelize.STRING(191),
          allowNull: true,
        },
        gender: {
          // 0: 선택안함, 1: 남성, 2: 여성
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
          comment: '0 none, 1 male, 2 female',
        },
        birth: {
          // 문자열로 원함(YYYY-MM-DD 등)
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        postCode: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        addressDetail: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        avatar: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: '프로필 이미지 URL',
        },
      },
      tableOpts
    );

    // 2) workspaces
    await queryInterface.createTable(
      'workspaces',
      {
        ...deletedAtCreate,
        registrationNumber: {
          type: Sequelize.STRING(191),
          allowNull: true,
        },
        name: {
          type: Sequelize.STRING(191),
          allowNull: false,
        },
        ceoName: {
          type: Sequelize.STRING(191),
          allowNull: true,
        },
        creatorName: {
          type: Sequelize.STRING(191),
          allowNull: true,
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        homepage: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        userId: {
          // 소유/생성자 FK(요청 스키마에 users 참조로 표기)
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      tableOpts
    );
    await queryInterface.addIndex('workspaces', ['userId'], {
      name: 'ix_workspaces_userId',
    });

    // 3) workspaceRoles (직책)
    await queryInterface.createTable(
      'workspaceRoles',
      {
        ...deletedAtCreate,
        name: {
          type: Sequelize.STRING(191),
          allowNull: false,
        },
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      tableOpts
    );
    // 같은 워크스페이스 내 동일 Role 이름 중복 방지
    await queryInterface.addIndex('workspaceRoles', ['workspaceId', 'name'], {
      unique: true,
      name: 'uq_workspaceRoles_workspaceId_name',
    });

    // 4) workspaceUsers (워크스페이스-사용자 매핑)
    await queryInterface.createTable(
      'workspaceUsers',
      {
        ...deletedAtCreate,
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        workspaceRoleId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'workspaceRoles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        grade: {
          type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: '1:슈퍼 리더, 2:리더, 3:멤버, 4:지원자, 5:대기'},
      },
      tableOpts
    );
    // 한 유저가 동일 워크스페이스에 중복 가입되지 않도록
    await queryInterface.addIndex('workspaceUsers', ['workspaceId', 'userId'], {
      unique: true,
      name: 'uq_workspaceUsers_workspaceId_userId',
    });
    await queryInterface.addIndex('workspaceUsers', ['workspaceRoleId'], {
      name: 'ix_workspaceUsers_workspaceRoleId',
    });

    // 5) recommendation (추천서)
    await queryInterface.createTable(
      'recommendation',
      {
        ...deletedAtCreate,
        fromUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '추천서 작성자 (users.id)',
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        toUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '추천서 받는 자 (users.id)',
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
      },
      tableOpts
    );
    await queryInterface.addIndex('recommendation', ['fromUserId'], {
      name: 'ix_recommendation_fromWU',
    });
    await queryInterface.addIndex('recommendation', ['toUserId'], {
      name: 'ix_recommendation_toWU',
    });
  },

  async down(queryInterface, _Sequelize) {
    // FK 의존 역순으로 제거
    await queryInterface.dropTable('recommendation');
    await queryInterface.dropTable('workspaceUsers');
    await queryInterface.dropTable('workspaceRoles');
    await queryInterface.dropTable('workspaces');
    await queryInterface.dropTable('users');
  },
};
