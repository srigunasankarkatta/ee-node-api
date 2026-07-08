'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('code_submissions', 'credited_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      after: 'submitted_at',
    });

    // Index so the pending-credit cron can find unprocessed rows quickly
    await queryInterface.addIndex('code_submissions', ['credited_at'], {
      name: 'idx_credited_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('code_submissions', 'idx_credited_at');
    await queryInterface.removeColumn('code_submissions', 'credited_at');
  },
};
