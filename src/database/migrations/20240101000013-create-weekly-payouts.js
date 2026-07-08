'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('weekly_payouts', {
      id:           { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:      { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' } },
      user_rank_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'user_ranks', key: 'id' } },
      amount:       { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payout_date:  { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'credited', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('weekly_payouts', ['payout_date']);
    await queryInterface.addIndex('weekly_payouts', ['user_id', 'payout_date'], { unique: true, name: 'uq_user_week' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('weekly_payouts');
  },
};
