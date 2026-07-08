'use strict';

// The original uq_user_week index was (user_id, payout_date) which blocks a user
// from receiving payments for multiple active ranks on the same Saturday.
// Replace it with (user_rank_id, payout_date) so each rank gets its own payment.
module.exports = {
  async up(queryInterface) {
    // Add a plain user_id index first so MySQL still has an index covering the FK
    // before we drop uq_user_week (which was the only user_id-covering index)
    await queryInterface.addIndex('weekly_payouts', ['user_id'], { name: 'idx_weekly_payouts_user_id' });
    await queryInterface.removeIndex('weekly_payouts', 'uq_user_week');
    await queryInterface.addIndex('weekly_payouts', ['user_rank_id', 'payout_date'], {
      unique: true,
      name: 'uq_rank_week',
    });
  },

  async down(queryInterface) {
    // Keep a plain user_rank_id index before dropping uq_rank_week — MySQL needs it for the FK.
    await queryInterface.addIndex('weekly_payouts', ['user_rank_id'], {
      name: 'idx_weekly_payouts_user_rank_id',
    });
    await queryInterface.removeIndex('weekly_payouts', 'uq_rank_week');
    await queryInterface.addIndex('weekly_payouts', ['user_id', 'payout_date'], {
      unique: true,
      name: 'uq_user_week',
    });
    await queryInterface.removeIndex('weekly_payouts', 'idx_weekly_payouts_user_id');
  },
};
