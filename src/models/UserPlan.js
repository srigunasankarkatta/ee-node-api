'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPlan = sequelize.define('UserPlan', {
  id:           { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:      { type: DataTypes.CHAR(36), allowNull: false },
  plan_id:      { type: DataTypes.STRING(10), allowNull: false },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled'),
    defaultValue: 'active',
  },
  tenure_months:        { type: DataTypes.TINYINT, allowNull: true },
  multiplier:           { type: DataTypes.TINYINT, allowNull: true },
  locked_until:         { type: DataTypes.DATEONLY, allowNull: true },
  credited_through_day: { type: DataTypes.SMALLINT, defaultValue: 0 },
  subscribed_at: { type: DataTypes.DATE },
  expires_at:    { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'user_plans',
  underscored: true,
});

module.exports = UserPlan;
