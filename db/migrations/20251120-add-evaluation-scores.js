// migrations/20251120-add-evaluation-scores.js
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // recommendation 테이블에 evaluationScores 필드 추가
    await queryInterface.addColumn('recommendation', 'evaluationScores', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: '품질 평가 점수 (JSON 형식)',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeColumn('recommendation', 'evaluationScores');
  },
};

