'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlanProjection = sequelize.define('PlanProjection', {
  id:               { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_id:          { type: DataTypes.STRING(10), allowNull: false },
  day_number:       { type: DataTypes.SMALLINT, allowNull: false },
  am_position:      { type: DataTypes.ENUM('UP', 'Down'), allowNull: false },
  am_trade_count:   { type: DataTypes.INTEGER, allowNull: false },
  am_rate:          { type: DataTypes.DECIMAL(8, 6), allowNull: true },
  am_trade_value:   { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  am_profit:        { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  am_closing:       { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  pm_position:      { type: DataTypes.ENUM('UP', 'Down'), allowNull: false },
  pm_trade_count:   { type: DataTypes.INTEGER, allowNull: false },
  pm_rate:          { type: DataTypes.DECIMAL(8, 6), allowNull: true },
  pm_trade_value:   { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  pm_profit:        { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  pm_closing:       { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  total_day_profit: { type: DataTypes.DECIMAL(16, 6), allowNull: false },
}, {
  tableName: 'plan_projections',
  underscored: true,
});

module.exports = PlanProjection;
