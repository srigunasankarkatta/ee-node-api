'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id:             { type: DataTypes.CHAR(36), primaryKey: true },
  name:           { type: DataTypes.STRING(100), allowNull: false },
  phone:          { type: DataTypes.STRING(15), allowNull: false, unique: true },
  email:          { type: DataTypes.STRING(150), allowNull: true, unique: true },
  password_hash:  { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('new_joiner', 'member', 'inviter', 'superior', 'admin'),
    defaultValue: 'new_joiner',
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'frozen'),
    defaultValue: 'pending',
  },
  referral_code:  { type: DataTypes.STRING(20), allowNull: false, unique: true },
  referred_by:    { type: DataTypes.CHAR(36), allowNull: true },
  phone_verified: { type: DataTypes.TINYINT, defaultValue: 0 },
  wallet_balance: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0.00 },
  joined_at:      { type: DataTypes.DATE },
  last_login:     { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'users',
  underscored: true,
});

module.exports = User;
