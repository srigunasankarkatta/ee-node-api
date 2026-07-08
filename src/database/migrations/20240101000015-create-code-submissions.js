'use strict';

// Tracks every code a user submits + the profit credited.
// Enforces: one AM + one PM submission per user per calendar day (IST).

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('code_submissions', {
      id:              { type: Sequelize.CHAR(36),      primaryKey: true, allowNull: false },
      user_id:         { type: Sequelize.CHAR(36),      allowNull: false, references: { model: 'users',         key: 'id' }, onDelete: 'CASCADE' },
      user_plan_id:    { type: Sequelize.CHAR(36),      allowNull: false, references: { model: 'user_plans',    key: 'id' } },
      trading_code_id: { type: Sequelize.CHAR(36),      allowNull: false, references: { model: 'trading_codes', key: 'id' } },
      plan_id:         { type: Sequelize.STRING(10),    allowNull: false },
      day_number:      { type: Sequelize.SMALLINT,      allowNull: false },
      code_type: {
        type: Sequelize.ENUM('welcome', 'regular_am', 'regular_pm', 'referral'),
        allowNull: false,
      },
      submitted_code:  { type: Sequelize.STRING(100),   allowNull: false },
      profit_amount:   { type: Sequelize.DECIMAL(16, 6), allowNull: false },
      submission_date: { type: Sequelize.DATEONLY,      allowNull: false },    // IST date
      submitted_at:    { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at:      { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:      { type: Sequelize.DATE,          allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    // One submission per user per code_type per IST calendar day
    await queryInterface.addIndex('code_submissions', ['user_id', 'code_type', 'submission_date'], {
      unique: true,
      name: 'uq_user_codetype_date',
    });
    await queryInterface.addIndex('code_submissions', ['user_id']);
    await queryInterface.addIndex('code_submissions', ['submission_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('code_submissions');
  },
};
