'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WeeklyPayout = sequelize.define('WeeklyPayout', {
  id:           { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:      { type: DataTypes.CHAR(36), allowNull: false },
  user_rank_id: { type: DataTypes.CHAR(36), allowNull: false },
  amount:       { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  payout_date:  { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'credited', 'failed'),
    defaultValue: 'credited',
  },
}, {
  tableName: 'weekly_payouts',
  underscored: true,
});

module.exports = WeeklyPayout;
