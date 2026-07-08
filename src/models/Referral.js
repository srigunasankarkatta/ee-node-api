'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Referral = sequelize.define('Referral', {
  id:          { type: DataTypes.CHAR(36), primaryKey: true },
  inviter_id:  { type: DataTypes.CHAR(36), allowNull: false },
  invitee_id:  { type: DataTypes.CHAR(36), allowNull: false, unique: true },
  superior_id: { type: DataTypes.CHAR(36), allowNull: true },
  plan_id:     { type: DataTypes.STRING(10), allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'rewarded'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'referrals',
  underscored: true,
});

module.exports = Referral;
