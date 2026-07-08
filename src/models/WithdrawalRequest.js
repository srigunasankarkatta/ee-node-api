'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id:               { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:          { type: DataTypes.CHAR(36), allowNull: false },
  bank_account_id:  { type: DataTypes.CHAR(36), allowNull: false },
  amount:            { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  gross_amount:      { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  deduction_percent: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  deduction_amount:  { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  requested_at:     { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  processed_at:     { type: DataTypes.DATE, allowNull: true },
  processed_by:     { type: DataTypes.CHAR(36), allowNull: true },
  rejection_reason: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'withdrawal_requests',
  underscored: true,
});

module.exports = WithdrawalRequest;
