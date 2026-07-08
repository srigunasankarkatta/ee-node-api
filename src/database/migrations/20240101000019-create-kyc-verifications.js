'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kyc_verifications', {
      id: {
        type:         Sequelize.CHAR(36),
        primaryKey:   true,
        allowNull:    false,
      },
      user_id: {
        type:       Sequelize.CHAR(36),
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      document_type: {
        type:      Sequelize.ENUM('pan', 'aadhaar', 'voter_id', 'driving_license'),
        allowNull: true,
      },
      document_number: {
        type:      Sequelize.STRING(50),
        allowNull: true,
      },
      front_image:      { type: Sequelize.STRING(500), allowNull: true },
      back_image:       { type: Sequelize.STRING(500), allowNull: true },
      selfie_with_id:   { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type:         Sequelize.ENUM('pending', 'verified', 'rejected'),
        allowNull:    false,
        defaultValue: 'pending',
      },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      submitted_at:     { type: Sequelize.DATE, allowNull: true },
      reviewed_at:      { type: Sequelize.DATE, allowNull: true },
      reviewed_by:      { type: Sequelize.CHAR(36), allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false },
      updated_at:       { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('kyc_verifications', ['user_id'], {
      unique: true,
      name:   'uq_kyc_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kyc_verifications');
  },
};
