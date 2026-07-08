'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const UserPlan = require('../models/UserPlan');
const TradingCode = require('../models/TradingCode');
const PlanProjection = require('../models/PlanProjection');
const CodeSubmission = require('../models/CodeSubmission');
const WalletTransaction = require('../models/WalletTransaction');
const { AppError } = require('../middleware/errorHandler');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Which profit column to credit per code type
const PROFIT_FIELD = {
  welcome:    'am_profit',   // welcome slot is in the AM window
  regular_am: 'am_profit',
  regular_pm: 'pm_profit',
  referral:   'pm_profit',   // referral slot comes after PM session
};

// Allowed time windows per type (IST HH:MM)
const SLOT_WINDOWS = {
  welcome:    { start: '10:00', end: '10:15' },
  regular_am: { start: '11:00', end: '11:15' },
  regular_pm: { start: '14:00', end: '14:15' },
  referral:   { start: '15:00', end: '15:15' },
};

function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function todayIST() {
  return nowIST().toISOString().slice(0, 10); // YYYY-MM-DD
}

function currentISTTime() {
  const ist = nowIST();
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
}

function isWithinSlot(codeType) {
  const slot = SLOT_WINDOWS[codeType];
  const now  = currentISTTime();
  return now >= slot.start && now <= slot.end;
}

/**
 * Calculates which day of the compounding plan the user is on.
 * Day 1 = the IST calendar date of subscription.
 * Day 2 = next IST calendar date, etc.
 */
function calcDayNumber(subscribedAt) {
  const subDate = new Date(
    new Date(subscribedAt).getTime() + IST_OFFSET_MS
  ).toISOString().slice(0, 10);

  const todayStr = todayIST();

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor(
    (new Date(todayStr).getTime() - new Date(subDate).getTime()) / msPerDay
  );

  return diff + 1; // Day 1 starts on subscription date
}

async function submitCode(userId, { code: submittedCode, code_type: codeType }) {
  // ── 1. Load user + active plan ───────────────────────────────────────────
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const userPlan = await UserPlan.findOne({ where: { user_id: userId, status: 'active' } });
  if (!userPlan) throw new AppError('No active plan. Subscribe to a plan first.', 403);

  // ── 2. Time-gate: must be within the slot window ─────────────────────────
  if (!isWithinSlot(codeType)) {
    const slot = SLOT_WINDOWS[codeType];
    throw new AppError(
      `${codeType} submission window is ${slot.start}–${slot.end} IST only`,
      403
    );
  }

  // ── 3. Welcome code: only valid in the first 5 days ──────────────────────
  const dayNumber = calcDayNumber(userPlan.subscribed_at);
  if (codeType === 'welcome' && dayNumber > 5) {
    throw new AppError('Welcome code is only valid for the first 5 days of your plan', 403);
  }

  // ── 4. Referral code: only valid after day 5 ─────────────────────────────
  if (codeType === 'referral' && dayNumber <= 5) {
    throw new AppError('Referral code is available from day 6 onwards', 403);
  }

  const today = todayIST();

  // ── 5. Duplicate check: one submission per code_type per IST day ──────────
  const alreadySubmitted = await CodeSubmission.findOne({
    where: { user_id: userId, code_type: codeType, submission_date: today },
  });
  if (alreadySubmitted) {
    throw new AppError(
      `You already submitted the ${codeType} code for today. Next window opens tomorrow.`,
      409
    );
  }

  // ── 6. Find the pre-seeded code for this user's plan + personal day number ──
  const tradingCode = await TradingCode.findOne({
    where: { day_number: dayNumber, plan_id: userPlan.plan_id, code_type: codeType },
  });
  if (!tradingCode) {
    throw new AppError(
      `No ${codeType} code found for day ${dayNumber} (Plan ${userPlan.plan_id})`,
      404
    );
  }

  // ── 7. Validate the submitted code against published codes ────────────────
  const publishedCodes = Array.isArray(tradingCode.codes) ? tradingCode.codes : [];
  const normalised = String(submittedCode).trim().toUpperCase();
  if (!publishedCodes.map(c => String(c).toUpperCase()).includes(normalised)) {
    throw new AppError('Invalid code. Please check and try again.', 400);
  }

  // ── 8. Get plan projection for today's day number ────────────────────────
  const projection = await PlanProjection.findOne({
    where: { plan_id: userPlan.plan_id, day_number: dayNumber },
  });
  if (!projection) {
    throw new AppError(
      `No projection data found for day ${dayNumber} of plan ${userPlan.plan_id}`,
      500
    );
  }

  const profitField  = PROFIT_FIELD[codeType];
  const profitAmount = parseFloat(projection[profitField]);

  const submittedAt  = new Date();
  const creditAfter  = new Date(submittedAt.getTime() + 30 * 60 * 1000); // 30 min later

  // ── 9. Record submission — wallet credit happens 30 min later via cron ────
  await CodeSubmission.create({
    id:              uuidv4(),
    user_id:         userId,
    user_plan_id:    userPlan.id,
    trading_code_id: tradingCode.id,
    plan_id:         userPlan.plan_id,
    day_number:      dayNumber,
    code_type:       codeType,
    submitted_code:  normalised,
    profit_amount:   profitAmount,
    submission_date: today,
    submitted_at:    submittedAt,
    credited_at:     null,  // set by creditPendingSubmissions job after 30 min
  });

  return {
    codeType,
    dayNumber,
    planId:         userPlan.plan_id,
    profitPending:  profitAmount,
    creditAfter:    creditAfter.toISOString(),
    session:        profitField === 'am_profit' ? 'AM' : 'PM',
    submissionDate: today,
  };
}

async function getSubmissionHistory(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await CodeSubmission.findAndCountAll({
    where:  { user_id: userId },
    order:  [['submitted_at', 'DESC']],
    limit,
    offset,
  });

  return {
    total: count,
    page,
    pages: Math.ceil(count / limit),
    data:  rows,
  };
}

module.exports = { submitCode, getSubmissionHistory };
