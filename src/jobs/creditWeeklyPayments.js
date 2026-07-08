'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const UserRank      = require('../models/UserRank');
const Rank          = require('../models/Rank');
const WeeklyPayout  = require('../models/WeeklyPayout');
const User          = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { sequelize } = require('../config/database');
const logger        = require('../config/logger');

function todayIST() {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return nowIST.toISOString().split('T')[0];
}

async function creditWeeklyPayments() {
  logger.info('[CRON] creditWeeklyPayments — starting');

  const today   = todayIST();
  let credited  = 0;
  let skipped   = 0;
  let completed = 0;
  let errors    = 0;

  // All active ranks that still have weeks remaining
  const activeRanks = await UserRank.findAll({
    where: {
      status:          'active',
      remaining_weeks: { [Op.gt]: 0 },
    },
  });

  for (const userRank of activeRanks) {
    // uq_rank_week prevents duplicate payment for same rank+date
    const alreadyPaid = await WeeklyPayout.findOne({
      where: { user_rank_id: userRank.id, payout_date: today },
    });
    if (alreadyPaid) {
      skipped++;
      continue;
    }

    const rank         = await Rank.findByPk(userRank.rank_id);
    const weeklyAmount = parseFloat(rank.weekly_payment);
    const newRemaining = userRank.remaining_weeks - 1;

    const t = await sequelize.transaction();
    try {
      const user         = await User.findByPk(userRank.user_id, { transaction: t, lock: true });
      const balanceBefore = parseFloat(user.wallet_balance);
      const balanceAfter  = +(balanceBefore + weeklyAmount).toFixed(2);

      await User.update(
        { wallet_balance: balanceAfter },
        { where: { id: userRank.user_id }, transaction: t }
      );

      await WalletTransaction.create({
        id:             uuidv4(),
        user_id:        userRank.user_id,
        type:           'credit',
        category:       'weekly_payout',
        amount:         weeklyAmount,
        balance_before: balanceBefore,
        balance_after:  balanceAfter,
        reference_id:   userRank.id,
        note:           `${userRank.rank_id} weekly payment (${newRemaining} weeks remaining)`,
      }, { transaction: t });

      await WeeklyPayout.create({
        id:           uuidv4(),
        user_id:      userRank.user_id,
        user_rank_id: userRank.id,
        amount:       weeklyAmount,
        payout_date:  today,
        status:       'credited',
      }, { transaction: t });

      await UserRank.update(
        {
          remaining_weeks: newRemaining,
          ...(newRemaining === 0 ? { status: 'completed', completed_at: new Date() } : {}),
        },
        { where: { id: userRank.id }, transaction: t }
      );

      await t.commit();
      credited++;

      if (newRemaining === 0) {
        completed++;
        logger.info(`[CRON]   ✓ ${userRank.rank_id} tenure complete for user ${userRank.user_id}`);
      } else {
        logger.info(`[CRON]   ✓ ${userRank.rank_id} ₹${weeklyAmount} → user ${userRank.user_id} (${newRemaining} weeks left)`);
      }
    } catch (err) {
      await t.rollback();
      logger.error(`[CRON] creditWeeklyPayments — failed for userRank ${userRank.id}: ${err.message}`);
      errors++;
    }
  }

  logger.info(`[CRON] creditWeeklyPayments done — ${credited} paid (${completed} tenures completed), ${skipped} already paid, ${errors} errors`);
}

module.exports = { creditWeeklyPayments };
