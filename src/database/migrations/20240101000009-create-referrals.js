'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referrals', {
      id:          { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      inviter_id:  { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'users', key: 'id' } },
      invitee_id:  { type: Sequelize.CHAR(36), allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
      superior_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      plan_id:     { type: Sequelize.STRING(10), allowNull: true, references: { model: 'plans', key: 'id' } },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'rewarded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.addIndex('referrals', ['inviter_id']);
    await queryInterface.addIndex('referrals', ['superior_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('referrals');
  },
};
