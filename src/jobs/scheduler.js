'use strict';

const cron = require('node-cron');
const { notifySlot }                = require('./notifySlot');
const { creditDailyProfit }         = require('./creditDailyProfit');
const { creditWeeklyPayments }      = require('./creditWeeklyPayments');
const { creditPendingSubmissions }  = require('./creditPendingSubmissions');
const logger = require('../config/logger');

const TZ = 'Asia/Kolkata';

function safe(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      logger.error(`[CRON] ${name} failed: ${err.message}`);
    }
  };
}

function startScheduler() {
  // In PM2 cluster mode every worker gets its own scheduler — only allow instance 0.
  const instanceId = process.env.pm_id ?? process.env.NODE_APP_INSTANCE;
  if (instanceId !== undefined && instanceId !== '0') {
    logger.info(`[CRON] Skipping scheduler on PM2 instance ${instanceId} (only runs on instance 0)`);
    return;
  }

  // ── Every minute ──────────────────────────────────────────────────────────
  // Credit wallet for code submissions that are 30+ minutes old
  cron.schedule('* * * * *', safe('creditPendingSubmissions', creditPendingSubmissions), { timezone: TZ });

  // ── 09:55 IST ─────────────────────────────────────────────────────────────
  // Welcome code reminder — window opens 10:00 IST (days 1–5 only)
  cron.schedule('55 9 * * *', safe('notify:welcome', () => notifySlot('welcome')), { timezone: TZ });

  // ── 10:55 IST ─────────────────────────────────────────────────────────────
  // AM regular code reminder — window opens 11:00 IST
  cron.schedule('55 10 * * *', safe('notify:regular_am', () => notifySlot('regular_am')), { timezone: TZ });

  // ── 13:55 IST ─────────────────────────────────────────────────────────────
  // PM regular code reminder — window opens 14:00 IST
  cron.schedule('55 13 * * *', safe('notify:regular_pm', () => notifySlot('regular_pm')), { timezone: TZ });

  // ── 14:55 IST ─────────────────────────────────────────────────────────────
  // Referral code reminder — window opens 15:00 IST (day 6+ only)
  cron.schedule('55 14 * * *', safe('notify:referral', () => notifySlot('referral')), { timezone: TZ });

  // ── 15:30 IST (daily) ─────────────────────────────────────────────────────
  // Credit daily trading profit to all active plan holders after all slots close
  cron.schedule('30 15 * * *', safe('creditDailyProfit', creditDailyProfit), { timezone: TZ });

  // ── 09:00 IST (every Saturday) ────────────────────────────────────────────
  // Credit weekly rank promotion payments to all users with active ranks
  cron.schedule('0 9 * * 6', safe('creditWeeklyPayments', creditWeeklyPayments), { timezone: TZ });

  logger.info('[CRON] Scheduler started — 7 jobs active (timezone: Asia/Kolkata)');
  logger.info('[CRON]   every minute          — credit pending code-submission profits (30-min delay)');
  logger.info('[CRON]   09:55 IST (daily)    — welcome slot reminder (days 1–5)');
  logger.info('[CRON]   10:55 IST (daily)    — AM regular slot reminder');
  logger.info('[CRON]   13:55 IST (daily)    — PM regular slot reminder');
  logger.info('[CRON]   14:55 IST (daily)    — referral slot reminder (day 6+)');
  logger.info('[CRON]   15:30 IST (daily)    — credit daily trading profit');
  logger.info('[CRON]   09:00 IST (Saturday) — credit weekly rank payments');
}

module.exports = { startScheduler };
