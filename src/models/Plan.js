'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plan = sequelize.define('Plan', {
  id:            { type: DataTypes.STRING(10), primaryKey: true },
  name:          { type: DataTypes.STRING(50), allowNull: false },
  principal:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  welcome_bonus: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  is_active:     { type: DataTypes.TINYINT, defaultValue: 1 },
}, {
  tableName: 'plans',
  underscored: true,
});

module.exports = Plan;
