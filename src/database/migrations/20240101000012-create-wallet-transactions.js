'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wallet_transactions', {
      id:             { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:        { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      type:           { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
      category: {
        type: Sequelize.ENUM(
          'welcome_bonus', 'inviter_reward', 'superior_reward',
          'level_achievement', 'weekly_payout', 'withdrawal', 'adjustment'
        ),
        allowNull: false,
      },
      amount:         { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      balance_before: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      balance_after:  { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      reference_id:   { type: Sequelize.CHAR(36), allowNull: true },
      note:           { type: Sequelize.STRING(255), allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('wallet_transactions', ['user_id']);
    await queryInterface.addIndex('wallet_transactions', ['category']);
    await queryInterface.addIndex('wallet_transactions', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wallet_transactions');
  },
};
