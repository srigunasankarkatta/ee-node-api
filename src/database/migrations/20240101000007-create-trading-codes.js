'use strict';

// plan_id enforces the business rule: codes are plan-scoped.
// A user on P1 can ONLY access P1 codes, never P2/P3/etc.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trading_codes', {
      id:           { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      code_date:    { type: Sequelize.DATEONLY, allowNull: false },
      plan_id:      { type: Sequelize.STRING(10), allowNull: false, references: { model: 'plans', key: 'id' } },
      code_type: {
        type: Sequelize.ENUM('welcome', 'regular_am', 'regular_pm', 'referral'),
        allowNull: false,
      },
      codes:        { type: Sequelize.JSON, allowNull: false },
      slot_start:   { type: Sequelize.TIME, allowNull: false },
      slot_end:     { type: Sequelize.TIME, allowNull: false },
      published_by: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' } },
      created_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:   { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('trading_codes', ['code_date']);
    await queryInterface.addIndex('trading_codes', ['code_date', 'plan_id', 'code_type'], {
      unique: true,
      name: 'uq_date_plan_type',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trading_codes');
  },
};
