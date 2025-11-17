// migrations/20251028-create-user-profile-details.js
/* eslint-disable no-unused-vars */
const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', engine: 'InnoDB' };

    // 1) userExperiences (사용자 경력)
    await queryInterface.createTable(
      'userExperiences',
      {
        ...deletedAtCreate, // id, createdAt, updatedAt, deletedAt
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        company: { type: Sequelize.STRING(255), allowNull: false, comment: '회사명' },
        position: { type: Sequelize.STRING(255), allowNull: false, comment: '직책/직위' },
        startDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '시작일' },
        endDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '종료일 (NULL이면 현재 재직중)' },
        description: { type: Sequelize.TEXT, allowNull: true, comment: '업무 내용' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userExperiences', ['userId'], { name: 'ix_userExperiences_userId' });
    await queryInterface.addIndex('userExperiences', ['deletedAt'], { name: 'ix_userExperiences_deletedAt' });

    // 2) userAwards (사용자 수상 이력)
    await queryInterface.createTable(
      'userAwards',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: { type: Sequelize.STRING(255), allowNull: false, comment: '수상명' },
        organization: { type: Sequelize.STRING(255), allowNull: true, comment: '수여 기관' },
        awardDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '수상일' },
        description: { type: Sequelize.TEXT, allowNull: true, comment: '상세 설명' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userAwards', ['userId'], { name: 'ix_userAwards_userId' });
    await queryInterface.addIndex('userAwards', ['deletedAt'], { name: 'ix_userAwards_deletedAt' });

    // 3) userCertifications (사용자 자격증)
    await queryInterface.createTable(
      'userCertifications',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: { type: Sequelize.STRING(255), allowNull: false, comment: '자격증명' },
        issuer: { type: Sequelize.STRING(255), allowNull: true, comment: '발급 기관' },
        issueDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '발급일' },
        expiryDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '만료일 (NULL이면 만료 없음)' },
        certificationNumber: { type: Sequelize.STRING(100), allowNull: true, comment: '자격증 번호' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userCertifications', ['userId'], { name: 'ix_userCertifications_userId' });
    await queryInterface.addIndex('userCertifications', ['deletedAt'], { name: 'ix_userCertifications_deletedAt' });

    // 4) userStrengths (사용자 강점)
    await queryInterface.createTable(
      'userStrengths',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        category: { type: Sequelize.STRING(100), allowNull: true, comment: '강점 카테고리 (기술, 리더십, 커뮤니케이션 등)' },
        strength: { type: Sequelize.STRING(255), allowNull: false, comment: '강점' },
        description: { type: Sequelize.TEXT, allowNull: true, comment: '상세 설명' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userStrengths', ['userId'], { name: 'ix_userStrengths_userId' });
    await queryInterface.addIndex('userStrengths', ['deletedAt'], { name: 'ix_userStrengths_deletedAt' });

    // 5) userReputations (사용자 평판)
    await queryInterface.createTable(
      'userReputations',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '평가 받는 사용자',
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fromUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: '평가한 사용자 (NULL이면 익명)',
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        rating: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          defaultValue: 5,
          comment: '평점 (1-5)',
        },
        comment: { type: Sequelize.TEXT, allowNull: true, comment: '평판 코멘트' },
        category: { type: Sequelize.STRING(100), allowNull: false, comment: '평가 카테고리 (협업능력, 전문성, 책임감 등)' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userReputations', ['userId'], { name: 'ix_userReputations_userId' });
    await queryInterface.addIndex('userReputations', ['fromUserId'], { name: 'ix_userReputations_fromUserId' });
    await queryInterface.addIndex('userReputations', ['deletedAt'], { name: 'ix_userReputations_deletedAt' });

    // 6) userProjects (사용자 프로젝트/포트폴리오)
    await queryInterface.createTable(
      'userProjects',
      {
        ...deletedAtCreate,
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: { type: Sequelize.STRING(255), allowNull: false, comment: '프로젝트명' },
        role: { type: Sequelize.STRING(100), allowNull: true, comment: '역할' },
        startDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '시작일' },
        endDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '종료일' },
        description: { type: Sequelize.TEXT, allowNull: true, comment: '프로젝트 설명' },
        technologies: { type: Sequelize.TEXT, allowNull: true, comment: '사용 기술' },
        achievement: { type: Sequelize.TEXT, allowNull: true, comment: '성과' },
        url: { type: Sequelize.STRING(500), allowNull: true, comment: '프로젝트 URL' },
      },
      tableOpts
    );
    await queryInterface.addIndex('userProjects', ['userId'], { name: 'ix_userProjects_userId' });
    await queryInterface.addIndex('userProjects', ['deletedAt'], { name: 'ix_userProjects_deletedAt' });

    // (선택) CHECK 제약은 MySQL 8.0+에서만 유효 — 필요시 주석 해제
    // await queryInterface.sequelize.query(
    //   "ALTER TABLE userReputations ADD CONSTRAINT chk_userReputations_rating CHECK (rating BETWEEN 1 AND 5)"
    // );
  },

  async down(queryInterface, Sequelize) {
    // FK 의존 역순으로 제거
    await queryInterface.dropTable('userProjects');
    await queryInterface.dropTable('userReputations');
    await queryInterface.dropTable('userStrengths');
    await queryInterface.dropTable('userCertifications');
    await queryInterface.dropTable('userAwards');
    await queryInterface.dropTable('userExperiences');
  },
};
