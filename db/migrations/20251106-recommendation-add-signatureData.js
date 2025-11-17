// migrations/20251105-alter-recommendation-add-signatureData.js

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'recommendation',
      'signatureData',
      {
        type: Sequelize.TEXT('long'), // LONGTEXT
        allowNull: true,
      },
      {
        // MySQL 전용: 컬럼 배치 위치
        after: 'content',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('recommendation', 'signatureData');
  },
};
