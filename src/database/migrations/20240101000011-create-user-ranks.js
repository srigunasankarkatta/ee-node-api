'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_ranks', {
      id:                   { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      user_id:              { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      rank_id:              { type: Sequelize.STRING(5), allowNull: false, references: { model: 'ranks', key: 'id' } },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      achievement_credited: { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 0 },
      remaining_weeks:      { type: Sequelize.SMALLINT, allowNull: false },
      activated_at:         { type: Sequelize.DATE, allowNull: true },
      completed_at:         { type: Sequelize.DATE, allowNull: true },
      created_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('user_ranks', ['user_id']);
    await queryInterface.addIndex('user_ranks', ['status', 'remaining_weeks'], { name: 'idx_active_ranks' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_ranks');
  },
};
