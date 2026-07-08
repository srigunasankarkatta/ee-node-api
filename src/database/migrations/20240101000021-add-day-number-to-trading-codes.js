'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trading_codes', 'day_number', {
      type: Sequelize.SMALLINT,
      allowNull: true,
      after: 'code_date',
    });

    // Old unique index was (code_date, plan_id, code_type) — replace with day_number based
    await queryInterface.removeIndex('trading_codes', 'uq_date_plan_type');

    await queryInterface.addIndex('trading_codes', ['day_number', 'plan_id', 'code_type'], {
      unique: true,
      name: 'uq_daynum_plan_type',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trading_codes', 'uq_daynum_plan_type');

    await queryInterface.addIndex('trading_codes', ['code_date', 'plan_id', 'code_type'], {
      unique: true,
      name: 'uq_date_plan_type',
    });

    await queryInterface.removeColumn('trading_codes', 'day_number');
  },
};
