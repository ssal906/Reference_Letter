// migrations/20251105-create-user-signatures.js
const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableOpts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    await queryInterface.createTable(
      'userSignatures',
      {
        // 공통 컬럼(id, createdAt, updatedAt, deletedAt)
        ...deletedAtCreate,

        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },

        // LONGTEXT
        signatureData: {
          type: Sequelize.TEXT('long'),
          allowNull: false,
        },

        signatureType: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'image',
        },
      },
      tableOpts
    );

    await queryInterface.addIndex('userSignatures', ['userId'], {
      name: 'ix_userSignatures_userId',
    });
    await queryInterface.addIndex('userSignatures', ['deletedAt'], {
      name: 'ix_userSignatures_deletedAt',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('userSignatures');
  },
};
