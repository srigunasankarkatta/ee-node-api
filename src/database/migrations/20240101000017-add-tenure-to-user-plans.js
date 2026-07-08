'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_plans', 'tenure_months', {
      type: Sequelize.TINYINT,
      allowNull: true,
      after: 'status',
    });
    await queryInterface.addColumn('user_plans', 'multiplier', {
      type: Sequelize.TINYINT,
      allowNull: true,
      after: 'tenure_months',
    });
    await queryInterface.addColumn('user_plans', 'locked_until', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: 'multiplier',
    });
    await queryInterface.addColumn('user_plans', 'credited_through_day', {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      after: 'locked_until',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_plans', 'credited_through_day');
    await queryInterface.removeColumn('user_plans', 'locked_until');
    await queryInterface.removeColumn('user_plans', 'multiplier');
    await queryInterface.removeColumn('user_plans', 'tenure_months');
  },
};
