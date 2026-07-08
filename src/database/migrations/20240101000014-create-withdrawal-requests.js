'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('withdrawal_requests', {
      id:               { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:          { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' } },
      bank_account_id:  { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'bank_accounts', key: 'id' } },
      amount:           { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'processed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      requested_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      processed_at:     { type: Sequelize.DATE, allowNull: true },
      processed_by:     { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      rejection_reason: { type: Sequelize.STRING(255), allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('withdrawal_requests', ['user_id']);
    await queryInterface.addIndex('withdrawal_requests', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('withdrawal_requests');
  },
};
