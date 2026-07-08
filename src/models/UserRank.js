'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserRank = sequelize.define('UserRank', {
  id:                   { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:              { type: DataTypes.CHAR(36), allowNull: false },
  rank_id:              { type: DataTypes.STRING(5), allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'completed'),
    defaultValue: 'active',
  },
  achievement_credited: { type: DataTypes.TINYINT, defaultValue: 0 },
  remaining_weeks:      { type: DataTypes.SMALLINT, allowNull: false },
  activated_at:         { type: DataTypes.DATE, allowNull: true },
  completed_at:         { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'user_ranks',
  underscored: true,
});

module.exports = UserRank;
