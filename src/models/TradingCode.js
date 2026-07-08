'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TradingCode = sequelize.define('TradingCode', {
  id:           { type: DataTypes.CHAR(36), primaryKey: true },
  code_date:    { type: DataTypes.DATEONLY, allowNull: true },
  day_number:   { type: DataTypes.SMALLINT, allowNull: true },
  plan_id:      { type: DataTypes.STRING(10), allowNull: false },
  code_type: {
    type: DataTypes.ENUM('welcome', 'regular_am', 'regular_pm', 'referral'),
    allowNull: false,
  },
  codes:        { type: DataTypes.JSON, allowNull: false },
  slot_start:   { type: DataTypes.STRING(8), allowNull: false },
  slot_end:     { type: DataTypes.STRING(8), allowNull: false },
  published_by: { type: DataTypes.CHAR(36), allowNull: false },
}, {
  tableName: 'trading_codes',
  underscored: true,
});

module.exports = TradingCode;
