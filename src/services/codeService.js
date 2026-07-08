'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const TradingCode = require('../models/TradingCode');
const UserPlan = require('../models/UserPlan');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Slot definitions per code type (all times in IST HH:MM)
const CODE_SLOTS = {
  welcome:    { start: '10:00', end: '10:15' },
  regular_am: { start: '11:00', end: '11:15' },
  regular_pm: { start: '14:00', end: '14:15' },
  referral:   { start: '15:00', end: '15:15' },
};

function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function todayIST() {
  const ist = nowIST();
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

function currentISTTime() {
  const ist = nowIST();
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
}

function isWithinSlot(slotStart, slotEnd) {
  const now = currentISTTime();
  return now >= slotStart && now <= slotEnd;
}

// Day 1 = the IST calendar date of subscription; Day 2 = next day, etc.
function calcDayNumber(subscribedAt) {
  const subDate = new Date(
    new Date(subscribedAt).getTime() + IST_OFFSET_MS
  ).toISOString().slice(0, 10);
  const todayStr = todayIST();
  const diff = Math.floor(
    (new Date(todayStr).getTime() - new Date(subDate).getTime()) / (24 * 60 * 60 * 1000)
  );
  return diff + 1;
}

function getEligibleTypes(userPlan, dayNumber) {
  const types = [];
  if (!userPlan) return types;
  if (dayNumber <= 5) types.push('welcome');
  types.push('regular_am', 'regular_pm');
  if (dayNumber > 5) types.push('referral');
  return types;
}

async function getUserActivePlan(userId) {
  return UserPlan.findOne({ where: { user_id: userId, status: 'active' } });
}

async function fetchCode(userId, codeType) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const userPlan = await getUserActivePlan(userId);
  if (!userPlan) throw new AppError('Active plan required to access trading codes', 403);

  const dayNumber = calcDayNumber(userPlan.subscribed_at);

  // Welcome-specific check: only valid in first 5 days
  if (codeType === 'welcome' && dayNumber > 5) {
    throw new AppError('Welcome code window has expired (valid for first 5 days only)', 403);
  }

  // Referral-specific check: only after day 5
  if (codeType === 'referral' && dayNumber <= 5) {
    throw new AppError('Referral code is only available after the first 5 days', 403);
  }

  // Time-gate check
  const slot = CODE_SLOTS[codeType];
  if (!isWithinSlot(slot.start, slot.end)) {
    throw new AppError(
      `${codeType} codes are only available between ${slot.start} – ${slot.end} IST`,
      403
    );
  }

  // Look up the pre-seeded code for this user's plan + personal day number
  const record = await TradingCode.findOne({
    where: {
      day_number: dayNumber,
      plan_id:    userPlan.plan_id,
      code_type:  codeType,
    },
  });

  if (!record) {
    throw new AppError(
      `No ${codeType} code found for day ${dayNumber} (Plan: ${userPlan.plan_id})`,
      404
    );
  }

  // Log access (fire-and-forget, non-blocking)
  _logAccess(userId, record.id).catch(() => {});

  return {
    codeType,
    planId: record.plan_id,
    dayNumber,
    codes: record.codes,
    slot: `${slot.start} – ${slot.end} IST`,
    date: todayIST(),
  };
}

async function getTodayCodes(userId) {
  const user = await User.findByPk(userId);
  const userPlan = await getUserActivePlan(userId);
  const dayNumber    = userPlan ? calcDayNumber(userPlan.subscribed_at) : null;
  const eligibleTypes = getEligibleTypes(userPlan, dayNumber);
  const currentTime  = currentISTTime();
  const today        = todayIST();
  const planId       = userPlan ? userPlan.plan_id : null;

  const available = eligibleTypes.map((type) => {
    const slot       = CODE_SLOTS[type];
    const isOpen     = currentTime >= slot.start && currentTime <= slot.end;
    const isPast     = currentTime > slot.end;
    return {
      codeType: type,
      slot:     `${slot.start} – ${slot.end} IST`,
      status:   isOpen ? 'open' : isPast ? 'closed' : 'upcoming',
    };
  });

  return { date: today, currentISTTime: currentTime, planId, dayNumber, slots: available };
}

async function _logAccess(userId, tradingCodeId) {
  const { sequelize } = require('../config/database');
  await sequelize.query(
    `INSERT IGNORE INTO user_code_access (id, user_id, trading_code_id, accessed_at, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW(), NOW())`,
    { replacements: [uuidv4(), userId, tradingCodeId] }
  );
}

module.exports = { fetchCode, getTodayCodes };
