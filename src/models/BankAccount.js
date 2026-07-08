'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BankAccount = sequelize.define('BankAccount', {
  id:             { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:        { type: DataTypes.CHAR(36), allowNull: false },
  account_holder: { type: DataTypes.STRING(100), allowNull: false },
  account_number: { type: DataTypes.STRING(30), allowNull: false },
  ifsc_code:      { type: DataTypes.STRING(15), allowNull: false },
  bank_name:      { type: DataTypes.STRING(100), allowNull: false },
  is_primary:     { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
}, {
  tableName: 'bank_accounts',
  underscored: true,
});

module.exports = BankAccount;
