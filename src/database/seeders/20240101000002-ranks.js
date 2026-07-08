'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('ranks', [
      { id: 'L1', level: 1, team_size_required: 5,    achievement_bonus: 2500.00,  weekly_payment: 100.00, tenure_weeks: 36, total_promo_bonus: 3600.00,  gross_benefit: 6100.00,  created_at: new Date(), updated_at: new Date() },
      { id: 'L2', level: 2, team_size_required: 25,   achievement_bonus: 4000.00,  weekly_payment: 150.00, tenure_weeks: 32, total_promo_bonus: 4800.00,  gross_benefit: 8800.00,  created_at: new Date(), updated_at: new Date() },
      { id: 'L3', level: 3, team_size_required: 125,  achievement_bonus: 8000.00,  weekly_payment: 250.00, tenure_weeks: 28, total_promo_bonus: 7000.00,  gross_benefit: 15000.00, created_at: new Date(), updated_at: new Date() },
      { id: 'L4', level: 4, team_size_required: 625,  achievement_bonus: 16000.00, weekly_payment: 400.00, tenure_weeks: 24, total_promo_bonus: 9600.00,  gross_benefit: 25600.00, created_at: new Date(), updated_at: new Date() },
      { id: 'L5', level: 5, team_size_required: 3125, achievement_bonus: 32000.00, weekly_payment: 600.00, tenure_weeks: 20, total_promo_bonus: 12000.00, gross_benefit: 44000.00, created_at: new Date(), updated_at: new Date() },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('ranks', { id: ['L1', 'L2', 'L3', 'L4', 'L5'] }, {});
  },
};
