'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const UserPlan       = require('../models/UserPlan');
const PlanProjection = require('../models/PlanProjection');
const User           = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { sequelize }  = require('../config/database');
const logger         = require('../config/logger');

const MAX_PLAN_DAYS = 300; // projection data exists for days 1–300

async function creditDailyProfit() {
  logger.info('[CRON] creditDailyProfit — starting');

  const now = Date.now();
  let credited = 0;
  let skipped  = 0;
  let errors   = 0;

  // All active plans that still have uncredited days
  const activePlans = await UserPlan.findAll({
    where: {
      status:               'active',
      credited_through_day: { [Op.lt]: MAX_PLAN_DAYS },
    },
  });

  for (const userPlan of activePlans) {
    const msSinceSubscribed = now - new Date(userPlan.subscribed_at).getTime();
    // Number of fully completed days (day 1 completes after 24h, day 2 after 48h, etc.)
    const completedDays = Math.floor(msSinceSubscribed / (24 * 60 * 60 * 1000));
    const creditableThrough = Math.min(completedDays, MAX_PLAN_DAYS);

    if (userPlan.credited_through_day >= creditableThrough) {
      skipped++;
      continue;
    }

    // Credit every missed day in order (handles multiple missed cron runs)
    for (let day = userPlan.credited_through_day + 1; day <= creditableThrough; day++) {
      const projection = await PlanProjection.findOne({
        where: { plan_id: userPlan.plan_id, day_number: day },
      });

      if (!projection) {
        logger.warn(`[CRON] creditDailyProfit — no projection for ${userPlan.plan_id} day ${day}`);
        continue;
      }

      const t = await sequelize.transaction();
      try {
        const amount = parseFloat(projection.total_day_profit);
        const user   = await User.findByPk(userPlan.user_id, { transaction: t, lock: true });

        const balanceBefore = parseFloat(user.wallet_balance);
        const balanceAfter  = +(balanceBefore + amount).toFixed(2);

        await User.update(
          { wallet_balance: balanceAfter },
          { where: { id: userPlan.user_id }, transaction: t }
        );
        await WalletTransaction.create({
          id:             uuidv4(),
          user_id:        userPlan.user_id,
          type:           'credit',
          category:       'daily_profit',
          amount,
          balance_before: balanceBefore,
          balance_after:  balanceAfter,
          reference_id:   userPlan.id,
          note:           `Day ${day} profit — ${userPlan.plan_id}`,
        }, { transaction: t });

        await UserPlan.update(
          { credited_through_day: day },
          { where: { id: userPlan.id }, transaction: t }
        );

        await t.commit();
        credited++;
      } catch (err) {
        await t.rollback();
        logger.error(`[CRON] creditDailyProfit — failed day ${day} for userPlan ${userPlan.id}: ${err.message}`);
        errors++;
        break; // stop this plan; will retry next run
      }
    }
  }

  logger.info(`[CRON] creditDailyProfit done — ${credited} credited, ${skipped} up-to-date, ${errors} errors`);
}

module.exports = { creditDailyProfit };
