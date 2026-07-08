'use strict';

const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const BankAccount = require('../models/BankAccount');
const UserPlan = require('../models/UserPlan');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const WalletTransaction = require('../models/WalletTransaction');
const { AppError } = require('../middleware/errorHandler');

const MIN_WITHDRAWAL   = 100;
const EARLY_DEDUCTION  = 40; // percent

async function getLockInfo(userId) {
  const userPlan = await UserPlan.findOne({ where: { user_id: userId, status: 'active' } });
  if (!userPlan || !userPlan.locked_until) return { isLocked: false, lockedUntil: null };
  const isLocked = new Date() < new Date(userPlan.locked_until);
  return { isLocked, lockedUntil: userPlan.locked_until };
}

// ── Bank Accounts ────────────────────────────────────────────────────────────

async function addBankAccount(userId, { account_holder, account_number, ifsc_code, bank_name }) {
  const existing = await BankAccount.findAll({ where: { user_id: userId } });

  // First account added is auto-set as primary
  const is_primary = existing.length === 0 ? 1 : 0;

  const account = await BankAccount.create({
    id: uuidv4(),
    user_id: userId,
    account_holder,
    account_number,
    ifsc_code:  ifsc_code.toUpperCase(),
    bank_name,
    is_primary,
  });

  return account;
}

async function getBankAccounts(userId) {
  return BankAccount.findAll({
    where:      { user_id: userId },
    order:      [['is_primary', 'DESC'], ['created_at', 'ASC']],
    attributes: ['id', 'account_holder', 'account_number', 'ifsc_code', 'bank_name', 'is_primary', 'created_at'],
  });
}

async function setPrimaryBankAccount(userId, accountId) {
  const account = await BankAccount.findOne({ where: { id: accountId, user_id: userId } });
  if (!account) throw new AppError('Bank account not found', 404);

  await sequelize.transaction(async (t) => {
    await BankAccount.update({ is_primary: 0 }, { where: { user_id: userId }, transaction: t });
    await account.update({ is_primary: 1 }, { transaction: t });
  });

  return account;
}

async function deleteBankAccount(userId, accountId) {
  const account = await BankAccount.findOne({ where: { id: accountId, user_id: userId } });
  if (!account) throw new AppError('Bank account not found', 404);

  // Don't allow deleting primary if other accounts exist
  if (account.is_primary) {
    const count = await BankAccount.count({ where: { user_id: userId } });
    if (count > 1) throw new AppError('Cannot delete primary account. Set another account as primary first.', 400);
  }

  await account.destroy();
}

// ── Withdrawal Requests ──────────────────────────────────────────────────────

async function previewWithdrawal(userId, amount) {
  if (amount < MIN_WITHDRAWAL) {
    throw new AppError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`, 400);
  }

  const user = await User.findByPk(userId);
  if (parseFloat(user.wallet_balance) < amount) {
    throw new AppError('Insufficient wallet balance', 400);
  }

  const { isLocked, lockedUntil } = await getLockInfo(userId);

  if (isLocked) {
    const deductionAmount   = Math.round(amount * EARLY_DEDUCTION / 100);
    const withdrawableAmount = amount - deductionAmount;
    return {
      requestedAmount: amount,
      isBeforeLockingPeriod: true,
      deductionPercent: EARLY_DEDUCTION,
      deductionAmount,
      withdrawableAmount,
      lockedUntil,
    };
  }

  return {
    requestedAmount: amount,
    isBeforeLockingPeriod: false,
    deductionPercent: 0,
    deductionAmount: 0,
    withdrawableAmount: amount,
    lockedUntil,
  };
}

async function requestWithdrawal(userId, amount, acceptEarlyDeduction = false) {
  if (amount < MIN_WITHDRAWAL) {
    throw new AppError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`, 400);
  }

  const primaryAccount = await BankAccount.findOne({ where: { user_id: userId, is_primary: 1 } });
  if (!primaryAccount) {
    throw new AppError('No primary bank account found. Please add a bank account first.', 400);
  }

  const pending = await WithdrawalRequest.findOne({ where: { user_id: userId, status: 'pending' } });
  if (pending) {
    throw new AppError('You already have a pending withdrawal request. Wait for it to be processed.', 409);
  }

  // Determine if within locking period
  const { isLocked, lockedUntil } = await getLockInfo(userId);

  let grossAmount      = amount;
  let deductionPercent = 0;
  let deductionAmount  = 0;
  let netAmount        = amount;

  if (isLocked) {
    if (!acceptEarlyDeduction) {
      const ded = Math.round(amount * EARLY_DEDUCTION / 100);
      throw new AppError('Early withdrawal requires confirmation', 409, {
        isBeforeLockingPeriod: true,
        lockedUntil,
        deductionPercent: EARLY_DEDUCTION,
        deductionAmount:  ded,
        withdrawableAmount: amount - ded,
      });
    }
    deductionPercent = EARLY_DEDUCTION;
    deductionAmount  = Math.round(amount * EARLY_DEDUCTION / 100);
    netAmount        = amount - deductionAmount;
  }

  return sequelize.transaction(async (t) => {
    // Read + lock user inside the transaction to prevent double-spend
    const user = await User.findByPk(userId, { transaction: t, lock: true });
    if (parseFloat(user.wallet_balance) < amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    const balanceBefore = parseFloat(user.wallet_balance);
    // Always debit the full requested amount; net is what admin pays out
    const balanceAfter  = +(balanceBefore - grossAmount).toFixed(2);

    await User.update(
      { wallet_balance: balanceAfter },
      { where: { id: userId }, transaction: t }
    );

    const txnNote = isLocked
      ? `Early withdrawal to ${primaryAccount.bank_name} ****${primaryAccount.account_number.slice(-4)} — ${EARLY_DEDUCTION}% deduction applied`
      : `Withdrawal request to ${primaryAccount.bank_name} ****${primaryAccount.account_number.slice(-4)}`;

    await WalletTransaction.create({
      id:             uuidv4(),
      user_id:        userId,
      type:           'debit',
      category:       'withdrawal',
      amount:         grossAmount,
      balance_before: balanceBefore,
      balance_after:  balanceAfter,
      note:           txnNote,
    }, { transaction: t });

    const request = await WithdrawalRequest.create({
      id:                uuidv4(),
      user_id:           userId,
      bank_account_id:   primaryAccount.id,
      amount:            netAmount,       // what admin pays to user
      gross_amount:      grossAmount,     // what was debited from wallet
      deduction_percent: deductionPercent,
      deduction_amount:  deductionAmount,
      status:            'pending',
      requested_at:      new Date(),
    }, { transaction: t });

    return {
      requestId:          request.id,
      grossAmount,
      deductionPercent,
      deductionAmount,
      amount:             netAmount,
      balanceAfter,
      bankAccount: {
        bank_name:      primaryAccount.bank_name,
        account_number: `****${primaryAccount.account_number.slice(-4)}`,
        ifsc_code:      primaryAccount.ifsc_code,
      },
    };
  });
}

async function getWithdrawals(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await WithdrawalRequest.findAndCountAll({
    where:      { user_id: userId },
    order:      [['requested_at', 'DESC']],
    limit:      parseInt(limit),
    offset:     parseInt(offset),
    attributes: ['id', 'bank_account_id', 'amount', 'status', 'requested_at', 'processed_at', 'rejection_reason'],
  });

  // Manual join — no association defined, avoid SequelizeEagerLoadingError
  const accountIds  = [...new Set(rows.map((r) => r.bank_account_id))];
  const accounts    = await BankAccount.findAll({
    where:      { id: accountIds },
    attributes: ['id', 'bank_name', 'account_number', 'ifsc_code'],
  });
  const accountMap  = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const data = rows.map((r) => {
    const acct = accountMap[r.bank_account_id];
    return {
      ...r.toJSON(),
      bank_account: acct ? {
        bank_name:      acct.bank_name,
        account_number: `****${acct.account_number.slice(-4)}`,
        ifsc_code:      acct.ifsc_code,
      } : null,
    };
  });

  return {
    total: count,
    page:  parseInt(page),
    pages: Math.ceil(count / limit),
    data,
  };
}

async function cancelWithdrawal(userId, requestId) {
  const request = await WithdrawalRequest.findOne({ where: { id: requestId, user_id: userId } });
  if (!request) throw new AppError('Withdrawal request not found', 404);
  if (request.status !== 'pending') throw new AppError('Only pending requests can be cancelled', 400);

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t, lock: true });
    const balanceBefore = parseFloat(user.wallet_balance);
    // Refund the full gross_amount that was originally debited (not the post-deduction net)
    const refundAmount  = +(request.gross_amount || request.amount);
    const balanceAfter  = +(balanceBefore + refundAmount).toFixed(2);

    await User.update({ wallet_balance: balanceAfter }, { where: { id: userId }, transaction: t });

    await WalletTransaction.create({
      id:             uuidv4(),
      user_id:        userId,
      type:           'credit',
      category:       'adjustment',
      amount:         refundAmount,
      balance_before: balanceBefore,
      balance_after:  balanceAfter,
      note:           'Withdrawal cancelled — full amount reversed',
    }, { transaction: t });

    await request.update({ status: 'rejected', rejection_reason: 'Cancelled by user', processed_at: new Date() }, { transaction: t });
  });
}

// ── Admin Actions ─────────────────────────────────────────────────────────────

async function getAllPendingWithdrawals({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await WithdrawalRequest.findAndCountAll({
    where:  { status: 'pending' },
    order:  [['requested_at', 'ASC']],
    limit:  parseInt(limit),
    offset: parseInt(offset),
  });

  return {
    total: count,
    page:  parseInt(page),
    pages: Math.ceil(count / limit),
    data:  rows,
  };
}

async function approveWithdrawal(requestId, adminId) {
  const request = await WithdrawalRequest.findByPk(requestId);
  if (!request) throw new AppError('Withdrawal request not found', 404);
  if (request.status !== 'pending') throw new AppError(`Request is already ${request.status}`, 400);

  await request.update({
    status:       'processed',
    processed_at: new Date(),
    processed_by: adminId,
  });

  return request;
}

async function rejectWithdrawal(requestId, adminId, reason) {
  const request = await WithdrawalRequest.findByPk(requestId);
  if (!request) throw new AppError('Withdrawal request not found', 404);
  if (request.status !== 'pending') throw new AppError(`Request is already ${request.status}`, 400);

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(request.user_id, { transaction: t, lock: true });
    const balanceBefore = parseFloat(user.wallet_balance);
    // Refund the full gross_amount that was originally debited (not the post-deduction net)
    const refundAmount  = +(request.gross_amount || request.amount);
    const balanceAfter  = +(balanceBefore + refundAmount).toFixed(2);

    await User.update({ wallet_balance: balanceAfter }, { where: { id: request.user_id }, transaction: t });

    await WalletTransaction.create({
      id:             uuidv4(),
      user_id:        request.user_id,
      type:           'credit',
      category:       'adjustment',
      amount:         refundAmount,
      balance_before: balanceBefore,
      balance_after:  balanceAfter,
      note:           `Withdrawal rejected: ${reason}`,
    }, { transaction: t });

    await request.update({
      status:           'rejected',
      rejection_reason: reason,
      processed_at:     new Date(),
      processed_by:     adminId,
    }, { transaction: t });

    return request;
  });
}

module.exports = {
  addBankAccount, getBankAccounts, setPrimaryBankAccount, deleteBankAccount,
  previewWithdrawal, requestWithdrawal, getWithdrawals, cancelWithdrawal,
  getAllPendingWithdrawals, approveWithdrawal, rejectWithdrawal,
};
