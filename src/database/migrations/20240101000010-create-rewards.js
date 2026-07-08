'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rewards', {
      id:           { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:      { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' } },
      type: {
        type: Sequelize.ENUM(
          'welcome_bonus', 'inviter_per_head', 'inviter_team',
          'superior_per_head', 'superior_team', 'level_achievement', 'weekly_payout'
        ),
        allowNull: false,
      },
      amount:       { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      reference_id: { type: Sequelize.CHAR(36), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'credited', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      note:         { type: Sequelize.STRING(255), allowNull: true },
      approved_by:  { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      approved_at:  { type: Sequelize.DATE, allowNull: true },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('rewards', ['user_id']);
    await queryInterface.addIndex('rewards', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rewards');
  },
};
