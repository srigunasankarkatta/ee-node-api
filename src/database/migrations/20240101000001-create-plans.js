'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plans', {
      id:            { type: Sequelize.STRING(10), primaryKey: true, allowNull: false },
      name:          { type: Sequelize.STRING(50), allowNull: false },
      principal:     { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      welcome_bonus: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      is_active:     { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 1 },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plans');
  },
};
