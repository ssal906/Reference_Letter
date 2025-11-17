// migrations/20251105-create-recommendation-templates.js
const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 공통 테이블 옵션
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    await queryInterface.createTable(
      'recommendationTemplates',
      {
        // id, createdAt, updatedAt, deletedAt 포함(soft delete)
        ...deletedAtCreate,

        // 양식 제목
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: '양식 제목',
        },

        // 양식 내용
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: '양식 내용',
        },

        // 양식 설명 (NULL 허용)
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '양식 설명',
        },
      },
      tableOpts
    );

    // (선택) 제목 검색 성능을 위한 인덱스
    await queryInterface.addIndex('recommendationTemplates', ['title'], {
      name: 'ix_recommendationTemplates_title',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('recommendationTemplates');
  },
};
