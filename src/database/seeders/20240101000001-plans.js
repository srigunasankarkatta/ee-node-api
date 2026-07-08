'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('plans', [
      { id: 'P1', name: 'Plan 1', principal: 11000.00, welcome_bonus: 225.00,  is_active: 1, created_at: new Date(), updated_at: new Date() },
      { id: 'P2', name: 'Plan 2', principal: 22000.00, welcome_bonus: 500.00,  is_active: 1, created_at: new Date(), updated_at: new Date() },
      { id: 'P3', name: 'Plan 3', principal: 33000.00, welcome_bonus: 825.00,  is_active: 1, created_at: new Date(), updated_at: new Date() },
      { id: 'P4', name: 'Plan 4', principal: 44000.00, welcome_bonus: 1100.00, is_active: 1, created_at: new Date(), updated_at: new Date() },
      { id: 'P5', name: 'Plan 5', principal: 55000.00, welcome_bonus: 1375.00, is_active: 1, created_at: new Date(), updated_at: new Date() },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('plans', { id: ['P1', 'P2', 'P3', 'P4', 'P5'] }, {});
  },
};
