'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_code_access', {
      id:              { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:         { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      trading_code_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'trading_codes', key: 'id' }, onDelete: 'CASCADE' },
      accessed_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('user_code_access', ['user_id', 'trading_code_id'], {
      unique: true,
      name: 'uq_user_code',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_code_access');
  },
};
