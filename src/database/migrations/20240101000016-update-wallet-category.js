'use strict';

// Adds 'daily_profit' to wallet_transactions.category enum
// so each code submission profit credit has its own category.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('wallet_transactions', 'category', {
      type: Sequelize.ENUM(
        'welcome_bonus', 'inviter_reward', 'superior_reward',
        'level_achievement', 'weekly_payout', 'withdrawal',
        'daily_profit',     // <-- added: profit from submitting a daily trading code
        'adjustment'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('wallet_transactions', 'category', {
      type: Sequelize.ENUM(
        'welcome_bonus', 'inviter_reward', 'superior_reward',
        'level_achievement', 'weekly_payout', 'withdrawal', 'adjustment'
      ),
      allowNull: false,
    });
  },
};
