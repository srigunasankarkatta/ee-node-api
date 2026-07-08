'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plan_projections', {
      id:               { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      plan_id:          { type: Sequelize.STRING(10), allowNull: false, references: { model: 'plans', key: 'id' } },
      day_number:       { type: Sequelize.SMALLINT, allowNull: false },

      // AM session
      am_position:      { type: Sequelize.ENUM('UP', 'Down'), allowNull: false },
      am_trade_count:   { type: Sequelize.INTEGER, allowNull: false },
      am_rate:          { type: Sequelize.DECIMAL(8, 6), allowNull: true },
      am_trade_value:   { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      am_profit:        { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      am_closing:       { type: Sequelize.DECIMAL(16, 6), allowNull: false },

      // PM session
      pm_position:      { type: Sequelize.ENUM('UP', 'Down'), allowNull: false },
      pm_trade_count:   { type: Sequelize.INTEGER, allowNull: false },
      pm_rate:          { type: Sequelize.DECIMAL(8, 6), allowNull: true },
      pm_trade_value:   { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      pm_profit:        { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      pm_closing:       { type: Sequelize.DECIMAL(16, 6), allowNull: false },

      total_day_profit: { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('plan_projections', ['plan_id', 'day_number'], { unique: true, name: 'uq_plan_day' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plan_projections');
  },
};
