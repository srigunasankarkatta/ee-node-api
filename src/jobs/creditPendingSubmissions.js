'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { sequelize }    = require('../config/database');
const CodeSubmission   = require('../models/CodeSubmission');
const User             = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const logger           = require('../config/logger');

const CREDIT_DELAY_MS = 30 * 60 * 1000; // 30 minutes

async function creditPendingSubmissions() {
  const cutoff = new Date(Date.now() - CREDIT_DELAY_MS);

  const pending = await CodeSubmission.findAll({
    where: {
      credited_at: null,
      submitted_at: { [Op.lte]: cutoff },
    },
  });

  if (pending.length === 0) return;

  logger.info(`[CRON] creditPendingSubmissions — ${pending.length} submission(s) due`);

  for (const sub of pending) {
    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(sub.user_id, { transaction: t, lock: true });
      if (!user) { await t.rollback(); continue; }

      const amount        = parseFloat(sub.profit_amount);
      const balanceBefore = parseFloat(user.wallet_balance);
      const balanceAfter  = +(balanceBefore + amount).toFixed(2);

      await User.update(
        { wallet_balance: balanceAfter },
        { where: { id: sub.user_id }, transaction: t }
      );

      await WalletTransaction.create({
        id:             uuidv4(),
        user_id:        sub.user_id,
        type:           'credit',
        category:       'daily_profit',
        amount,
        balance_before: balanceBefore,
        balance_after:  balanceAfter,
        reference_id:   sub.id,
        note:           `Day ${sub.day_number} · ${sub.code_type} profit · Plan ${sub.plan_id}`,
      }, { transaction: t });

      await CodeSubmission.update(
        { credited_at: new Date() },
        { where: { id: sub.id }, transaction: t }
      );

      await t.commit();
      logger.info(`[CRON]   ✓ ₹${amount} credited to user ${sub.user_id} (${sub.code_type} day ${sub.day_number})`);
    } catch (err) {
      await t.rollback();
      logger.error(`[CRON] creditPendingSubmissions — failed sub ${sub.id}: ${err.message}`);
    }
  }
}

module.exports = { creditPendingSubmissions };
