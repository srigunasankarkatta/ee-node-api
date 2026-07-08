'use strict';

const { Op } = require('sequelize');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

async function getBalance(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'name', 'wallet_balance'],
  });
  return {
    userId:  user.id,
    name:    user.name,
    balance: parseFloat(user.wallet_balance),
  };
}

async function getTransactions(userId, { page = 1, limit = 20, category } = {}) {
  const offset = (page - 1) * limit;
  const where  = { user_id: userId };
  if (category) where.category = category;

  const { count, rows } = await WalletTransaction.findAndCountAll({
    where,
    order:  [['created_at', 'DESC']],
    limit:  parseInt(limit),
    offset: parseInt(offset),
    attributes: ['id', 'type', 'category', 'amount', 'balance_before', 'balance_after', 'note', 'created_at'],
  });

  return {
    total:  count,
    page:   parseInt(page),
    pages:  Math.ceil(count / limit),
    data:   rows,
  };
}

// Earnings summary grouped by category
async function getSummary(userId) {
  const txns = await WalletTransaction.findAll({
    where: { user_id: userId },
    attributes: ['type', 'category', 'amount'],
  });

  const credits  = {};
  let totalEarned = 0;
  let totalWithdrawn = 0;

  for (const t of txns) {
    const amt = parseFloat(t.amount);
    if (t.type === 'credit') {
      credits[t.category] = (credits[t.category] || 0) + amt;
      totalEarned += amt;
    } else {
      totalWithdrawn += amt;
    }
  }

  const user = await User.findByPk(userId, { attributes: ['wallet_balance'] });

  return {
    currentBalance: parseFloat(user.wallet_balance),
    totalEarned,
    totalWithdrawn,
    breakdown: credits,
  };
}

module.exports = { getBalance, getTransactions, getSummary };
