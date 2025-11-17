// migrations/20251106-remove-grade-from-workspaceUsers.js
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, _Sequelize) {
      // workspaceUsers.grade 컬럼 제거
      await queryInterface.removeColumn('workspaceUsers', 'grade');
    },
  
    async down(queryInterface, Sequelize) {
      // 롤백 시 grade 컬럼 복구 (원본 정의와 동일)
      await queryInterface.addColumn('workspaceUsers', 'grade', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: '1:슈퍼 리더, 2:리더, 3:멤버, 4:지원자, 5:대기',
      });
    },
  };
  