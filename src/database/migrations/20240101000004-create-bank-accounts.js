'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_accounts', {
      id:             { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:        { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      account_holder: { type: Sequelize.STRING(100), allowNull: false },
      account_number: { type: Sequelize.STRING(30), allowNull: false },
      ifsc_code:      { type: Sequelize.STRING(15), allowNull: false },
      bank_name:      { type: Sequelize.STRING(100), allowNull: false },
      is_primary:     { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 0 },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('bank_accounts', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_accounts');
  },
};
