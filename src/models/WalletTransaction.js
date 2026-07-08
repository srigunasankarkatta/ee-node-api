'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WalletTransaction = sequelize.define('WalletTransaction', {
  id:             { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:        { type: DataTypes.CHAR(36), allowNull: false },
  type:           { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
  category: {
    type: DataTypes.ENUM(
      'welcome_bonus', 'inviter_reward', 'superior_reward',
      'level_achievement', 'weekly_payout', 'withdrawal',
      'daily_profit', 'adjustment'
    ),
    allowNull: false,
  },
  amount:         { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  balance_before: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  balance_after:  { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  reference_id:   { type: DataTypes.CHAR(36), allowNull: true },
  note:           { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'wallet_transactions',
  underscored: true,
});

module.exports = WalletTransaction;
