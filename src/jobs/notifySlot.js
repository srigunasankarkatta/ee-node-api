'use strict';

const { Op } = require('sequelize');
const User = require('../models/User');
const UserPlan = require('../models/UserPlan');
const { notifyBulk } = require('../services/notificationService');
const logger = require('../config/logger');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const SLOT_META = {
  welcome:    { window: '10:00–10:15 IST', opens: '10:00 IST' },
  regular_am: { window: '11:00–11:15 IST', opens: '11:00 IST' },
  regular_pm: { window: '14:00–14:15 IST', opens: '14:00 IST' },
  referral:   { window: '15:00–15:15 IST', opens: '15:00 IST' },
};

function getDayNumber(subscribedAt) {
  const subIST  = new Date(new Date(subscribedAt).getTime() + IST_OFFSET_MS);
  const subDay  = Date.UTC(subIST.getUTCFullYear(), subIST.getUTCMonth(), subIST.getUTCDate());
  const nowIST  = new Date(Date.now() + IST_OFFSET_MS);
  const todayDay = Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate());
  return Math.floor((todayDay - subDay) / 86400000) + 1;
}

async function notifySlot(codeType) {
  const meta = SLOT_META[codeType];
  logger.info(`[CRON] notifySlot(${codeType}) — reminder for ${meta.window}`);

  // Step 1: get all active user_plans
  const activePlans = await UserPlan.findAll({ where: { status: 'active' } });
  if (activePlans.length === 0) {
    logger.info(`[CRON] No active plans — skipping ${codeType} notification`);
    return;
  }

  // Build a map of user_id → { plan_id, subscribed_at }
  const planMap = {};
  for (const up of activePlans) {
    planMap[up.user_id] = { plan_id: up.plan_id, subscribed_at: up.subscribed_at };
  }

  // Step 2: fetch those users (active only)
  const users = await User.findAll({
    where: { id: { [Op.in]: Object.keys(planMap) }, status: 'active' },
    attributes: ['id', 'name', 'phone'],
  });

  // Step 3: filter by day-number eligibility
  const eligible = users
    .map((u) => {
      const { plan_id, subscribed_at } = planMap[u.id];
      return { ...u.toJSON(), plan_id, day: getDayNumber(subscribed_at) };
    })
    .filter((u) => {
      if (codeType === 'welcome')  return u.day >= 1 && u.day <= 5;
      if (codeType === 'referral') return u.day >= 6;
      return true; // regular_am and regular_pm — all active members
    });

  if (eligible.length === 0) {
    logger.info(`[CRON] No eligible users for ${codeType} slot`);
    return;
  }

  // Step 4: send notifications
  await notifyBulk(
    eligible,
    (u) => `[${u.plan_id} | Day ${u.day}] Your ${codeType.replace(/_/g, ' ')} code window opens at ${meta.opens} (${meta.window}) — log in now to fetch your code`,
    'log' // swap to 'whatsapp' or 'sms' when provider is configured
  );
}

module.exports = { notifySlot };
