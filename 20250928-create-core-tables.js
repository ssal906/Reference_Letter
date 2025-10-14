const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    // 1) Users
    await queryInterface.createTable(
      'users',
      {
        ...deletedAtCreate,
        email: { type: Sequelize.STRING(191), allowNull: false, unique: true },
        password: { type: Sequelize.STRING(255), allowNull: false }, // bcrypt 해시 저장
        name: { type: Sequelize.STRING(191), allowNull: false }, // 추천서, UI 표시용 필수
        nickname: { type: Sequelize.STRING(191), allowNull: true },
        gender: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: true,
          comment: '0: 선택안함, 1: 남성, 2: 여성',
        },
        birth: { type: Sequelize.STRING(32), allowNull: true },
        phoneNumber: { type: Sequelize.STRING(50), allowNull: true },
        address: { type: Sequelize.STRING(255), allowNull: true },
        addressDetail: { type: Sequelize.STRING(255), allowNull: true },
        addressCode: { type: Sequelize.STRING(20), allowNull: true },
        avatarImg: { type: Sequelize.STRING(255), allowNull: true },
        isOnboarded: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      tableOpts
    );

    // 2) Workspaces
    await queryInterface.createTable(
      'workspaces',
      {
        ...deletedAtCreate,
        name: { type: Sequelize.STRING(191), allowNull: false },
        serialNumber: { type: Sequelize.STRING(191), allowNull: true },
        isPublic: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      },
      tableOpts
    );

    // users 테이블에 FK를 뒤늦게 추가
    await queryInterface.addColumn('users', 'currentWorkspaceId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'workspaces', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
});


    // 3) WorkspaceUsers
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
        grade: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          comment: '1:슈퍼리더 2:리더 3:멤버 4:지원자 5:대기',
        },
      },
      tableOpts
    );
    await queryInterface.addIndex('workspaceUsers', ['workspaceId', 'userId'], {
      unique: true,
      name: 'uq_workspaceUsers_workspaceId_userId',
    });

    // 4) referenceLetters
    await queryInterface.createTable(
      'referenceLetters',
      {
        ...deletedAtCreate,
        fromUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        toUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: { type: Sequelize.TEXT, allowNull: false },
        isDraft: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      tableOpts
    );

    // 5) Requests
    await queryInterface.createTable(
      'requests',
      {
        ...deletedAtCreate,
        workspaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'workspaces', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          comment: '1: 추천서',
        },
        fromUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        toUserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: '대기' },
      },
      tableOpts
    );

    // 6) Notifications
    await queryInterface.createTable(
      'notifications',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(255), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: true },
        isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        requestId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'requests', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      tableOpts
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('requests');
    await queryInterface.dropTable('referenceLetters');
    await queryInterface.dropTable('workspaceUsers');
    await queryInterface.dropTable('workspaces');
    await queryInterface.dropTable('users');
  },
};
