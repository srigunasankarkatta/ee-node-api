'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ranks', {
      id:                  { type: Sequelize.STRING(5), primaryKey: true, allowNull: false },
      level:               { type: Sequelize.TINYINT, allowNull: false },
      team_size_required:  { type: Sequelize.INTEGER, allowNull: false },
      achievement_bonus:   { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      weekly_payment:      { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tenure_weeks:        { type: Sequelize.SMALLINT, allowNull: false },
      total_promo_bonus:   { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      gross_benefit:       { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ranks');
  },
};
