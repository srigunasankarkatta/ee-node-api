'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rank = sequelize.define('Rank', {
  id:                 { type: DataTypes.STRING(5), primaryKey: true },
  level:              { type: DataTypes.TINYINT, allowNull: false },
  team_size_required: { type: DataTypes.INTEGER, allowNull: false },
  achievement_bonus:  { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  weekly_payment:     { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  tenure_weeks:       { type: DataTypes.SMALLINT, allowNull: false },
  total_promo_bonus:  { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  gross_benefit:      { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
  tableName: 'ranks',
  underscored: true,
});

module.exports = Rank;
