// migrations/20251117-create-userDetailPermissions.js
const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    // userDetailPermissions 테이블 생성
    await queryInterface.createTable(
      'userDetailPermissions',
      {
        ...deletedAtCreate, // id, createdAt, updatedAt, deletedAt

        userId: {
          type: Sequelize.INTEGER,
          allowNull: true, // 회원가입 전에도 권한 부여 가능
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: '상세정보 소유자 (회원가입 후 자동 연결)',
        },

        ownerEmail: {
          type: Sequelize.STRING(191),
          allowNull: false,
          comment: '권한 소유자 이메일 (회원가입 전에도 사용 가능)',
        },

        allowedEmail: {
          type: Sequelize.STRING(191),
          allowNull: false,
          comment: '상세정보 조회 허용 이메일',
        },

        note: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: '메모 (예: 이교수님 추천서용)',
        },
      },
      tableOpts
    );

    // 인덱스 추가
    await queryInterface.addIndex('userDetailPermissions', ['userId'], {
      name: 'idx_userId',
    });

    await queryInterface.addIndex('userDetailPermissions', ['ownerEmail'], {
      name: 'idx_ownerEmail',
    });

    await queryInterface.addIndex('userDetailPermissions', ['allowedEmail'], {
      name: 'idx_allowedEmail',
    });

    await queryInterface.addIndex('userDetailPermissions', ['deletedAt'], {
      name: 'idx_deletedAt',
    });

    // UNIQUE KEY: ownerEmail + allowedEmail
    // deletedAt을 포함하지 않음 (소프트 삭제 지원)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_ownerEmail_allowedEmail 
      ON userDetailPermissions (ownerEmail, allowedEmail)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('userDetailPermissions');
  },
};


