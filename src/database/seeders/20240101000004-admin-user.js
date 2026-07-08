'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Change these before deploying to production
const ADMIN_PHONE    = '9999999999';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME     = 'Xceed Admin';
const ADMIN_EMAIL    = 'admin@xceed16.com';

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const adminId      = uuidv4();

    await queryInterface.bulkInsert('users', [{
      id:             adminId,
      name:           ADMIN_NAME,
      phone:          ADMIN_PHONE,
      email:          ADMIN_EMAIL,
      password_hash:  passwordHash,
      role:           'admin',
      status:         'active',
      referral_code:  'ADMIN00001',
      referred_by:    null,
      phone_verified: 1,
      wallet_balance: 0.00,
      joined_at:      new Date(),
      last_login:     null,
      created_at:     new Date(),
      updated_at:     new Date(),
    }], {});

    console.log(`  Admin user created — phone: ${ADMIN_PHONE} | password: ${ADMIN_PASSWORD}`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { phone: ADMIN_PHONE }, {});
  },
};
