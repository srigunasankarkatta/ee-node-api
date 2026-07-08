'use strict';

const { Op } = require('sequelize');
const WalletTransaction = require('../models/WalletTransaction');

const REWARD_CATEGORIES = {
  welcome_bonus:     'Welcome Bonus',
  inviter_reward:    'Inviter Reward',
  superior_reward:   'Superior Reward',
  level_achievement: 'Rank Achievement Bonus',
  weekly_payout:     'Weekly Rank Payout',
};

const TYPE_FILTERS = {
  welcome:  ['welcome_bonus'],
  inviter:  ['inviter_reward'],
  superior: ['superior_reward'],
  rank:     ['level_achievement', 'weekly_payout'],
};

async function sumByCategories(userId, categories) {
  const txns = await WalletTransaction.findAll({
    where: {
      user_id:  userId,
      type:     'credit',
      category: { [Op.in]: categories },
    },
    attributes: ['category', 'amount'],
  });

  let total = 0;
  const breakdown = {};
  for (const t of txns) {
    const amt = parseFloat(t.amount);
    total += amt;
    breakdown[t.category] = (breakdown[t.category] || 0) + amt;
  }

  return { total: +total.toFixed(2), breakdown };
}

async function getAllRewards(userId) {
  const categories = Object.keys(REWARD_CATEGORIES);
  const { total, breakdown } = await sumByCategories(userId, categories);

  const formatted = {};
  for (const [cat, label] of Object.entries(REWARD_CATEGORIES)) {
    if (breakdown[cat]) {
      formatted[cat] = {
        label,
        amount: +breakdown[cat].toFixed(2),
      };
    }
  }

  return { totalEarned: total, rewards: formatted };
}

async function getWelcomeBonus(userId) {
  const { total, breakdown } = await sumByCategories(userId, TYPE_FILTERS.welcome);
  return { total: +total.toFixed(2), breakdown };
}

async function getInviterRewards(userId) {
  const { total, breakdown } = await sumByCategories(userId, TYPE_FILTERS.inviter);
  return { total: +total.toFixed(2), breakdown };
}

async function getSuperiorRewards(userId) {
  const { total, breakdown } = await sumByCategories(userId, TYPE_FILTERS.superior);
  return { total: +total.toFixed(2), breakdown };
}

async function getRewardHistory(userId, { page = 1, limit = 20, type } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where  = { user_id: userId, type: 'credit' };

  if (type && TYPE_FILTERS[type]) {
    where.category = { [Op.in]: TYPE_FILTERS[type] };
  } else {
    where.category = { [Op.in]: Object.keys(REWARD_CATEGORIES) };
  }

  const { count, rows } = await WalletTransaction.findAndCountAll({
    where,
    order:      [['created_at', 'DESC']],
    limit:      parseInt(limit, 10),
    offset,
    attributes: ['id', 'category', 'amount', 'note', 'reference_id', 'created_at'],
  });

  return {
    total: count,
    page:  parseInt(page, 10),
    pages: Math.ceil(count / parseInt(limit, 10)),
    data:  rows.map((r) => ({
      id:         r.id,
      category:   r.category,
      label:      REWARD_CATEGORIES[r.category] || r.category,
      amount:     +parseFloat(r.amount).toFixed(2),
      note:       r.note,
      referenceId: r.reference_id,
      createdAt:  r.created_at,
    })),
  };
}

module.exports = {
  getAllRewards,
  getWelcomeBonus,
  getInviterRewards,
  getSuperiorRewards,
  getRewardHistory,
};
