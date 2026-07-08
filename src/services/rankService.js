'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const Referral    = require('../models/Referral');
const UserPlan    = require('../models/UserPlan');
const UserRank    = require('../models/UserRank');
const Rank        = require('../models/Rank');
const User        = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const logger      = require('../config/logger');

// Rank upgrade rules.
// requiredRank: rank_id the direct referrals must already hold (null = just need active plan).
// count: minimum qualifying direct referrals needed.
// Rules from the platform image:
//   L1 → 5 direct subordinates with an active plan
//   L2 → 5 direct subordinates at L1
//   L3 → 4 direct subordinates at L2  (image: "atleast 4 L2 Rank required")
//   L4 → 4 direct subordinates at L3  (inferred from same pattern)
//   L5 → 4 direct subordinates at L4  (inferred from same pattern)
const RANK_RULES = {
  L1: { requiredRank: null, count: 5 },
  L2: { requiredRank: 'L1', count: 5 },
  L3: { requiredRank: 'L2', count: 4 },
  L4: { requiredRank: 'L3', count: 4 },
  L5: { requiredRank: 'L4', count: 4 },
};

async function getHighestRankLevel(userId) {
  const rows = await UserRank.findAll({ where: { user_id: userId } });
  if (!rows.length) return 0;
  return Math.max(...rows.map((r) => parseInt(r.rank_id.replace('L', ''), 10)));
}

async function getDirectReferralIds(userId) {
  const refs = await Referral.findAll({ where: { inviter_id: userId } });
  return refs.map((r) => r.invitee_id);
}

async function countQualifiedForRank(rankId, directIds) {
  const rule = RANK_RULES[rankId];
  if (!rule || directIds.length === 0) return 0;

  if (rule.requiredRank === null) {
    return UserPlan.count({
      where: { user_id: { [Op.in]: directIds }, status: 'active' },
    });
  }

  return UserRank.count({
    where: {
      user_id: { [Op.in]: directIds },
      rank_id: rule.requiredRank,
      status:  { [Op.in]: ['active', 'completed'] },
    },
  });
}

async function qualifiesForRank(rankId, directIds) {
  const rule = RANK_RULES[rankId];
  if (!rule || directIds.length === 0) return false;
  const count = await countQualifiedForRank(rankId, directIds);
  return count >= rule.count;
}

async function grantRank(userId, rankId, transaction) {
  const rank = await Rank.findByPk(rankId, { transaction });

  const userRankId = uuidv4();
  await UserRank.create({
    id:                   userRankId,
    user_id:              userId,
    rank_id:              rankId,
    status:               'active',
    achievement_credited: 1,
    remaining_weeks:      rank.tenure_weeks,
    activated_at:         new Date(),
  }, { transaction });

  // Credit achievement bonus to wallet
  const user         = await User.findByPk(userId, { transaction, lock: true });
  const balanceBefore = parseFloat(user.wallet_balance);
  const balanceAfter  = +(balanceBefore + parseFloat(rank.achievement_bonus)).toFixed(2);

  await User.update({ wallet_balance: balanceAfter }, { where: { id: userId }, transaction });
  await WalletTransaction.create({
    id:             uuidv4(),
    user_id:        userId,
    type:           'credit',
    category:       'level_achievement',
    amount:         rank.achievement_bonus,
    balance_before: balanceBefore,
    balance_after:  balanceAfter,
    reference_id:   userRankId,
    note:           `${rankId} achievement bonus`,
  }, { transaction });

  logger.info(`[RANK] User ${userId} promoted to ${rankId} — ₹${rank.achievement_bonus} achievement bonus credited`);
}

// Check whether userId now qualifies for the next rank and grant it if so.
// Propagates upward: if granting a rank triggers the user's own inviter to qualify, check them too.
// depth guard prevents infinite loops.
async function checkAndUpgradeRank(userId, transaction, depth = 0) {
  if (!userId || depth >= 5) return;

  const directIds    = await getDirectReferralIds(userId);
  let highestLevel   = await getHighestRankLevel(userId);
  let anyUpgrade     = false;

  while (highestLevel < 5) {
    const nextRankId = `L${highestLevel + 1}`;
    const qualifies  = await qualifiesForRank(nextRankId, directIds);
    if (!qualifies) break;

    await grantRank(userId, nextRankId, transaction);
    highestLevel++;
    anyUpgrade = true;
  }

  // Propagate up: if this user was promoted, their own inviter may now qualify for the next rank
  if (anyUpgrade) {
    const myRef = await Referral.findOne({ where: { invitee_id: userId }, transaction });
    if (myRef) {
      await checkAndUpgradeRank(myRef.inviter_id, transaction, depth + 1);
    }
  }
}

function formatRankProgress(rankId, current, rule) {
  return {
    rankId,
    required:    rule.count,
    current,
    remaining:   Math.max(0, rule.count - current),
    qualifies:   current >= rule.count,
    requirement: rule.requiredRank === null
      ? `${rule.count} direct members with an active plan`
      : `${rule.count} direct members at ${rule.requiredRank}`,
  };
}

async function getNextRankProgress(userId) {
  const directIds    = await getDirectReferralIds(userId);
  const highestLevel = await getHighestRankLevel(userId);

  if (highestLevel >= 5) return null;

  const nextRankId = `L${highestLevel + 1}`;
  const rule       = RANK_RULES[nextRankId];
  const current    = await countQualifiedForRank(nextRankId, directIds);

  return formatRankProgress(nextRankId, current, rule);
}

async function getMyRank(userId) {
  const userRanks = await UserRank.findAll({
    where: { user_id: userId },
    order: [['activated_at', 'ASC']],
  });

  const rankDefs = await Rank.findAll({ order: [['level', 'ASC']] });
  const rankMap  = Object.fromEntries(rankDefs.map((r) => [r.id, r]));

  const highestLevel = await getHighestRankLevel(userId);
  const activeRanks  = userRanks
    .filter((ur) => ur.status === 'active')
    .map((ur) => ({
      rankId:          ur.rank_id,
      level:           rankMap[ur.rank_id]?.level,
      status:          ur.status,
      remainingWeeks:  ur.remaining_weeks,
      weeklyPayment:   rankMap[ur.rank_id] ? +parseFloat(rankMap[ur.rank_id].weekly_payment).toFixed(2) : null,
      achievementBonus: rankMap[ur.rank_id] ? +parseFloat(rankMap[ur.rank_id].achievement_bonus).toFixed(2) : null,
      activatedAt:     ur.activated_at,
    }));

  return {
    highestRank:   highestLevel > 0 ? `L${highestLevel}` : null,
    highestLevel,
    activeRanks,
    nextRank:      await getNextRankProgress(userId),
    directTeamSize: (await getDirectReferralIds(userId)).length,
  };
}

async function getLevels() {
  const ranks = await Rank.findAll({ order: [['level', 'ASC']] });

  return ranks.map((r) => ({
    rankId:            r.id,
    level:             r.level,
    teamSizeRequired:  r.team_size_required,
    achievementBonus:  +parseFloat(r.achievement_bonus).toFixed(2),
    weeklyPayment:     +parseFloat(r.weekly_payment).toFixed(2),
    tenureWeeks:       r.tenure_weeks,
    totalPromoBonus:   +parseFloat(r.total_promo_bonus).toFixed(2),
    grossBenefit:      +parseFloat(r.gross_benefit).toFixed(2),
    upgradeRule:       RANK_RULES[r.id]
      ? (RANK_RULES[r.id].requiredRank === null
        ? `${RANK_RULES[r.id].count} direct members with an active plan`
        : `${RANK_RULES[r.id].count} direct members at ${RANK_RULES[r.id].requiredRank}`)
      : null,
  }));
}

async function getUpgradeCheck(userId) {
  const progress = await getNextRankProgress(userId);
  if (!progress) {
    return {
      eligible: false,
      message:  'You have reached the highest rank (L5)',
      progress: null,
    };
  }

  return {
    eligible: progress.qualifies,
    message:  progress.qualifies
      ? `You qualify for ${progress.rankId}. Promotion happens automatically on the next qualifying event.`
      : `Need ${progress.remaining} more qualifying member(s) for ${progress.rankId}`,
    progress,
  };
}

async function getRankHistory(userId) {
  const rows = await UserRank.findAll({
    where:   { user_id: userId },
    order:   [['activated_at', 'DESC']],
  });

  const rankDefs = await Rank.findAll();
  const rankMap  = Object.fromEntries(rankDefs.map((r) => [r.id, r]));

  return rows.map((ur) => ({
    id:               ur.id,
    rankId:           ur.rank_id,
    level:            rankMap[ur.rank_id]?.level,
    status:           ur.status,
    achievementBonus: rankMap[ur.rank_id] ? +parseFloat(rankMap[ur.rank_id].achievement_bonus).toFixed(2) : null,
    remainingWeeks:   ur.remaining_weeks,
    activatedAt:      ur.activated_at,
    completedAt:      ur.completed_at,
  }));
}

module.exports = {
  checkAndUpgradeRank,
  getMyRank,
  getLevels,
  getUpgradeCheck,
  getRankHistory,
  RANK_RULES,
};
