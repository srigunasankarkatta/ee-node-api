'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('withdrawal_requests', 'gross_amount', {
      type:         Sequelize.DECIMAL(12, 2),
      allowNull:    true,
    });
    await queryInterface.addColumn('withdrawal_requests', 'deduction_percent', {
      type:         Sequelize.TINYINT,
      allowNull:    false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('withdrawal_requests', 'deduction_amount', {
      type:         Sequelize.DECIMAL(12, 2),
      allowNull:    false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('withdrawal_requests', 'gross_amount');
    await queryInterface.removeColumn('withdrawal_requests', 'deduction_percent');
    await queryInterface.removeColumn('withdrawal_requests', 'deduction_amount');
  },
};
