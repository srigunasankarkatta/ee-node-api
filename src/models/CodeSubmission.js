'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CodeSubmission = sequelize.define('CodeSubmission', {
  id:              { type: DataTypes.CHAR(36),       primaryKey: true },
  user_id:         { type: DataTypes.CHAR(36),       allowNull: false },
  user_plan_id:    { type: DataTypes.CHAR(36),       allowNull: false },
  trading_code_id: { type: DataTypes.CHAR(36),       allowNull: false },
  plan_id:         { type: DataTypes.STRING(10),     allowNull: false },
  day_number:      { type: DataTypes.SMALLINT,       allowNull: false },
  code_type: {
    type: DataTypes.ENUM('welcome', 'regular_am', 'regular_pm', 'referral'),
    allowNull: false,
  },
  submitted_code:  { type: DataTypes.STRING(100),   allowNull: false },
  profit_amount:   { type: DataTypes.DECIMAL(16, 6), allowNull: false },
  submission_date: { type: DataTypes.DATEONLY,       allowNull: false },
  submitted_at:    { type: DataTypes.DATE },
  credited_at:     { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'code_submissions',
  underscored: true,
});

module.exports = CodeSubmission;
