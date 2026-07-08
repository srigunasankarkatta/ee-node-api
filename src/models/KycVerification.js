'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KycVerification = sequelize.define('KycVerification', {
  id:              { type: DataTypes.CHAR(36), primaryKey: true },
  user_id:         { type: DataTypes.CHAR(36), allowNull: false },
  document_type: {
    type: DataTypes.ENUM('pan', 'aadhaar', 'voter_id', 'driving_license'),
    allowNull: true,
  },
  document_number:  { type: DataTypes.STRING(50), allowNull: true },
  front_image:      { type: DataTypes.STRING(500), allowNull: true },
  back_image:       { type: DataTypes.STRING(500), allowNull: true },
  selfie_with_id:   { type: DataTypes.STRING(500), allowNull: true },
  status: {
    type:         DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull:    false,
    defaultValue: 'pending',
  },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  submitted_at:     { type: DataTypes.DATE, allowNull: true },
  reviewed_at:      { type: DataTypes.DATE, allowNull: true },
  reviewed_by:      { type: DataTypes.CHAR(36), allowNull: true },
}, {
  tableName:  'kyc_verifications',
  underscored: true,
});

module.exports = KycVerification;
