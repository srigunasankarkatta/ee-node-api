'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id:             { type: Sequelize.CHAR(36), primaryKey: true, allowNull: false },
      name:           { type: Sequelize.STRING(100), allowNull: false },
      phone:          { type: Sequelize.STRING(15), allowNull: false, unique: true },
      email:          { type: Sequelize.STRING(150), allowNull: true, unique: true },
      password_hash:  { type: Sequelize.STRING(255), allowNull: false },
      role: {
        type: Sequelize.ENUM('new_joiner', 'member', 'inviter', 'superior', 'admin'),
        allowNull: false,
        defaultValue: 'new_joiner',
      },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'suspended', 'frozen'),
        allowNull: false,
        defaultValue: 'pending',
      },
      referral_code:  { type: Sequelize.STRING(20), allowNull: false, unique: true },
      referred_by:    { type: Sequelize.CHAR(36), allowNull: true },
      phone_verified: { type: Sequelize.TINYINT(1), allowNull: false, defaultValue: 0 },
      wallet_balance: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0.00 },
      joined_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      last_login:     { type: Sequelize.DATE, allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    await queryInterface.addIndex('users', ['referral_code']);
    await queryInterface.addIndex('users', ['referred_by']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
