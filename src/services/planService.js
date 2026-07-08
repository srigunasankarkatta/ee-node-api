'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const Plan         = require('../models/Plan');
const UserPlan     = require('../models/UserPlan');
const PlanProjection = require('../models/PlanProjection');
const Referral     = require('../models/Referral');
const User         = require('../models/User');
const { sequelize } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { checkAndUpgradeRank } = require('./rankService');

// Tenure options: months → { multiplier, lockingDays }
const TENURE_MAP = {
  9:  { multiplier: 2,  lockingDays: 90  },
  18: { multiplier: 4,  lockingDays: 180 },
  27: { multiplier: 8,  lockingDays: 270 },
  36: { multiplier: 16, lockingDays: 360 },
};

// Inviter reward per plan (credited per head when a referral subscribes)
const INVITER_REWARDS = {
  P1: { per_head: 275  },
  P2: { per_head: 650  },
  P3: { per_head: 1025 },
  P4: { per_head: 1400 },
  P5: { per_head: 1875 },
};

// Superior reward per plan
const SUPERIOR_REWARDS = {
  P1: { per_head: 50  },
  P2: { per_head: 100 },
  P3: { per_head: 150 },
  P4: { per_head: 200 },
  P5: { per_head: 250 },
};

async function listPlans() {
  return Plan.findAll({ where: { is_active: 1 }, order: [['principal', 'ASC']] });
}

async function getPlan(planId) {
  const plan = await Plan.findByPk(planId);
  if (!plan || !plan.is_active) throw new AppError('Plan not found', 404);
  return plan;
}

async function getProjection(planId, limit = 60) {
  await getPlan(planId);
  return PlanProjection.findAll({
    where: { plan_id: planId },
    order: [['day_number', 'ASC']],
    limit,
  });
}

async function subscribe(userId, planId, tenureMonths) {
  // Validate tenure
  const tenure = TENURE_MAP[tenureMonths];
  if (!tenure) throw new AppError('tenure_months must be one of: 9, 18, 27, 36', 422);

  const plan = await getPlan(planId);

  // One active plan at a time
  const existing = await UserPlan.findOne({ where: { user_id: userId, status: 'active' } });
  if (existing) throw new AppError('You already have an active plan', 409);

  const now         = new Date();
  const lockedUntil = new Date(now);
  lockedUntil.setDate(lockedUntil.getDate() + tenure.lockingDays);

  const expiresAt   = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + tenureMonths);

  const t = await sequelize.transaction();
  try {
    const userPlanId = uuidv4();

    await UserPlan.create({
      id:            userPlanId,
      user_id:       userId,
      plan_id:       planId,
      status:        'active',
      tenure_months: tenureMonths,
      multiplier:    tenure.multiplier,
      locked_until:  lockedUntil.toISOString().split('T')[0],
      subscribed_at: now,
      expires_at:    expiresAt,
    }, { transaction: t });

    // Credit welcome bonus
    const welcomeBonus = parseFloat(plan.welcome_bonus);
    await _creditWallet(userId, welcomeBonus, 'welcome_bonus', userPlanId, `Welcome bonus for ${plan.name}`, t);

    // Upgrade user role to member
    await User.update({ role: 'member' }, { where: { id: userId }, transaction: t });

    // Handle referral rewards and rank upgrades
    const referral = await Referral.findOne({ where: { invitee_id: userId }, transaction: t });
    if (referral) {
      await referral.update({ plan_id: planId, status: 'active' }, { transaction: t });

      // Credit inviter per-head reward
      const inviterReward = INVITER_REWARDS[planId];
      if (inviterReward) {
        await _creditWallet(
          referral.inviter_id, inviterReward.per_head,
          'inviter_reward', userPlanId,
          `Per-head referral bonus from ${planId}`, t
        );

        // Upgrade inviter role to inviter if still at member
        const inviter = await User.findByPk(referral.inviter_id, { transaction: t });
        if (inviter && inviter.role === 'member') {
          await inviter.update({ role: 'inviter' }, { transaction: t });
        }
      }

      // Credit superior per-head reward
      if (referral.superior_id) {
        const superiorReward = SUPERIOR_REWARDS[planId];
        if (superiorReward) {
          await _creditWallet(
            referral.superior_id, superiorReward.per_head,
            'superior_reward', userPlanId,
            `Superior reward from ${planId}`, t
          );
        }
      }

      // Check rank upgrades: inviter may now qualify for L1+ from this new subscription
      await checkAndUpgradeRank(referral.inviter_id, t);

      // Check superior separately — their invitee (the inviter) may have just reached a new rank,
      // triggering the superior's own upgrade eligibility
      if (referral.superior_id) {
        await checkAndUpgradeRank(referral.superior_id, t);
      }
    }

    await t.commit();
    return {
      userPlanId,
      planId,
      tenureMonths,
      multiplier:     tenure.multiplier,
      lockedUntil:    lockedUntil.toISOString().split('T')[0],
      expiresAt:      expiresAt.toISOString().split('T')[0],
      welcomeBonus,
      projectedBenefit: parseFloat(plan.principal) * tenure.multiplier,
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Internal: credit wallet and record transaction atomically
async function _creditWallet(userId, amount, category, referenceId, note, transaction) {
  const WalletTransaction = require('../models/WalletTransaction');
  const user = await User.findByPk(userId, { transaction, lock: true });
  const balanceBefore = parseFloat(user.wallet_balance);
  const balanceAfter  = +(balanceBefore + amount).toFixed(2);

  await User.update({ wallet_balance: balanceAfter }, { where: { id: userId }, transaction });
  await WalletTransaction.create({
    id:             uuidv4(),
    user_id:        userId,
    type:           'credit',
    category,
    amount,
    balance_before: balanceBefore,
    balance_after:  balanceAfter,
    reference_id:   referenceId,
    note,
  }, { transaction });
}

module.exports = { listPlans, getPlan, getProjection, subscribe };
