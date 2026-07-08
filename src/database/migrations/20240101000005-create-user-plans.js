'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_plans', {
      id:           { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:      { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      plan_id:      { type: Sequelize.STRING(10), allowNull: false, references: { model: 'plans', key: 'id' } },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
      },
      subscribed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      expires_at:    { type: Sequelize.DATE, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('user_plans', ['user_id']);
    await queryInterface.addIndex('user_plans', ['plan_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_plans');
  },
};
