'use strict';

const { Op } = require('sequelize');
const User              = require('../models/User');
const UserPlan          = require('../models/UserPlan');
const Referral          = require('../models/Referral');
const UserRank          = require('../models/UserRank');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const KycVerification   = require('../models/KycVerification');
const BankAccount       = require('../models/BankAccount');
const TradingCode       = require('../models/TradingCode');
const CodeSubmission    = require('../models/CodeSubmission');
const { sequelize }     = require('../config/database');
const { AppError }      = require('../middleware/errorHandler');
const withdrawalService = require('./withdrawalService');

const CODE_TYPE_LABEL = {
  welcome:    'Welcome',
  regular_am: 'AM Regular',
  regular_pm: 'PM Regular',
  referral:   'Referral',
};

function parseCodes(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [raw];
    }
  }
  return [];
}

async function getStats() {
  const [
    totalUsers,
    activeUsers,
    membersWithPlan,
    pendingWithdrawals,
    pendingKyc,
    totalWalletBalance,
    totalWithdrawn,
  ] = await Promise.all([
    User.count({ where: { role: { [Op.ne]: 'admin' } } }),
    User.count({ where: { role: { [Op.ne]: 'admin' }, status: 'active' } }),
    UserPlan.count({ where: { status: 'active' } }),
    WithdrawalRequest.count({ where: { status: 'pending' } }),
    KycVerification.count({ where: { status: 'pending' } }),
    User.sum('wallet_balance', { where: { role: { [Op.ne]: 'admin' } } }),
    WalletTransaction.sum('amount', { where: { type: 'debit', category: 'withdrawal' } }),
  ]);

  const planBreakdown = await UserPlan.findAll({
    where:  { status: 'active' },
    attributes: [
      'plan_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['plan_id'],
    raw: true,
  });

  const recentSignups = await User.count({
    where: {
      role:      { [Op.ne]: 'admin' },
      joined_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    users: {
      total:        totalUsers,
      active:       activeUsers,
      recentSignups7d: recentSignups,
    },
    plans: {
      activeSubscriptions: membersWithPlan,
      byPlan: Object.fromEntries(planBreakdown.map((r) => [r.plan_id, parseInt(r.count, 10)])),
    },
    withdrawals: {
      pending: pendingWithdrawals,
      totalProcessed: await WithdrawalRequest.count({ where: { status: 'processed' } }),
    },
    kyc: { pending: pendingKyc },
    finance: {
      totalWalletBalance: +(parseFloat(totalWalletBalance || 0)).toFixed(2),
      totalWithdrawn:     +(parseFloat(totalWithdrawn || 0)).toFixed(2),
    },
  };
}

async function listUsers({ page = 1, limit = 20, search, role, status } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where  = { role: { [Op.ne]: 'admin' } };

  if (role)   where.role   = role;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { name:          { [Op.like]: `%${search}%` } },
      { phone:         { [Op.like]: `%${search}%` } },
      { email:         { [Op.like]: `%${search}%` } },
      { referral_code: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    order:      [['joined_at', 'DESC']],
    limit:      parseInt(limit, 10),
    offset,
    attributes: ['id', 'name', 'phone', 'email', 'role', 'status', 'referral_code', 'wallet_balance', 'joined_at', 'last_login'],
  });

  const userIds = rows.map((u) => u.id);
  const activePlans = userIds.length
    ? await UserPlan.findAll({ where: { user_id: { [Op.in]: userIds }, status: 'active' }, attributes: ['user_id', 'plan_id'] })
    : [];
  const planMap = Object.fromEntries(activePlans.map((p) => [p.user_id, p.plan_id]));

  return {
    total: count,
    page:  parseInt(page, 10),
    pages: Math.ceil(count / parseInt(limit, 10)),
    data:  rows.map((u) => ({
      id:            u.id,
      name:          u.name,
      phone:         u.phone,
      email:         u.email,
      role:          u.role,
      status:        u.status,
      referralCode:  u.referral_code,
      walletBalance: +parseFloat(u.wallet_balance).toFixed(2),
      activePlanId:  planMap[u.id] || null,
      joinedAt:      u.joined_at,
      lastLogin:     u.last_login,
    })),
  };
}

async function getUserDetail(userId) {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password_hash'] },
  });
  if (!user || user.role === 'admin') throw new AppError('User not found', 404);

  const [activePlan, referralsMade, referredByUser, ranks, kyc, bankAccounts, recentTxns, codeSubmissions] = await Promise.all([
    UserPlan.findOne({ where: { user_id: userId, status: 'active' }, order: [['subscribed_at', 'DESC']] }),
    Referral.count({ where: { inviter_id: userId } }),
    user.referred_by ? User.findByPk(user.referred_by, { attributes: ['id', 'name', 'phone', 'referral_code'] }) : null,
    UserRank.findAll({ where: { user_id: userId }, order: [['activated_at', 'DESC']] }),
    KycVerification.findOne({ where: { user_id: userId } }),
    BankAccount.findAll({ where: { user_id: userId }, attributes: ['id', 'account_holder', 'account_number', 'ifsc_code', 'bank_name', 'is_primary'] }),
    WalletTransaction.findAll({
      where:   { user_id: userId },
      order:   [['created_at', 'DESC']],
      limit:   10,
      attributes: ['id', 'type', 'category', 'amount', 'note', 'created_at'],
    }),
    CodeSubmission.findAll({
      where:   { user_id: userId },
      order:   [['submitted_at', 'DESC']],
      limit:   30,
    }),
  ]);

  const directReferrals = await Referral.findAll({
    where:   { inviter_id: userId },
    order:   [['created_at', 'DESC']],
    limit:   20,
  });

  const inviteeIds = directReferrals.map((r) => r.invitee_id);
  const invitees = inviteeIds.length
    ? await User.findAll({ where: { id: { [Op.in]: inviteeIds } }, attributes: ['id', 'name', 'phone', 'status', 'joined_at'] })
    : [];
  const inviteeMap = Object.fromEntries(invitees.map((u) => [u.id, u]));

  return {
    user: {
      id:            user.id,
      name:          user.name,
      phone:         user.phone,
      email:         user.email,
      role:          user.role,
      status:        user.status,
      referralCode:  user.referral_code,
      walletBalance: +parseFloat(user.wallet_balance).toFixed(2),
      joinedAt:      user.joined_at,
      lastLogin:     user.last_login,
    },
    activePlan: activePlan ? {
      planId:       activePlan.plan_id,
      tenureMonths: activePlan.tenure_months,
      multiplier:   activePlan.multiplier,
      subscribedAt: activePlan.subscribed_at,
      expiresAt:    activePlan.expires_at,
      lockedUntil:  activePlan.locked_until,
    } : null,
    referredBy: referredByUser,
    team: {
      directCount: referralsMade,
      directMembers: directReferrals.map((r) => {
        const inv = inviteeMap[r.invitee_id];
        return inv ? {
          userId:   inv.id,
          name:     inv.name,
          phone:    inv.phone,
          status:   inv.status,
          joinedAt: inv.joined_at,
          referralStatus: r.status,
          planId:   r.plan_id,
        } : null;
      }).filter(Boolean),
    },
    ranks: ranks.map((r) => ({
      rankId:         r.rank_id,
      status:         r.status,
      remainingWeeks: r.remaining_weeks,
      activatedAt:    r.activated_at,
    })),
    kyc: kyc ? {
      id:              kyc.id,
      status:          kyc.status,
      documentType:    kyc.document_type,
      documentNumber:  kyc.document_number,
      submittedAt:     kyc.submitted_at,
      reviewedAt:      kyc.reviewed_at,
      rejectionReason: kyc.rejection_reason,
      frontImage:      kyc.front_image,
      backImage:       kyc.back_image,
      selfieWithId:    kyc.selfie_with_id,
    } : null,
    bankAccounts,
    recentTransactions: recentTxns.map((t) => ({
      id:        t.id,
      type:      t.type,
      category:  t.category,
      amount:    +parseFloat(t.amount).toFixed(2),
      note:      t.note,
      createdAt: t.created_at,
    })),
    codeSubmissions: codeSubmissions.map((s) => ({
      id:             s.id,
      planId:         s.plan_id,
      dayNumber:      s.day_number,
      codeType:       s.code_type,
      codeLabel:      CODE_TYPE_LABEL[s.code_type] || s.code_type,
      submittedCode:  s.submitted_code,
      profitAmount:   +parseFloat(s.profit_amount).toFixed(2),
      submissionDate: s.submission_date,
      submittedAt:    s.submitted_at,
      creditedAt:     s.credited_at,
      creditStatus:   s.credited_at ? 'credited' : 'pending',
    })),
  };
}

async function updateUserStatus(userId, status) {
  const allowed = ['active', 'suspended', 'frozen'];
  if (!allowed.includes(status)) throw new AppError(`status must be one of: ${allowed.join(', ')}`, 422);

  const user = await User.findByPk(userId);
  if (!user || user.role === 'admin') throw new AppError('User not found', 404);

  await user.update({ status });
  return { id: user.id, name: user.name, status: user.status };
}

async function listWithdrawals({ page = 1, limit = 20, status } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where  = {};
  if (status) where.status = status;

  const { count, rows } = await WithdrawalRequest.findAndCountAll({
    where,
    order: [['requested_at', 'DESC']],
    limit:  parseInt(limit, 10),
    offset,
  });

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const bankIds = [...new Set(rows.map((r) => r.bank_account_id))];

  const [users, banks] = await Promise.all([
    userIds.length ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'phone'] }) : [],
    bankIds.length ? BankAccount.findAll({ where: { id: { [Op.in]: bankIds } }, attributes: ['id', 'account_holder', 'account_number', 'ifsc_code', 'bank_name'] }) : [],
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const bankMap = Object.fromEntries(banks.map((b) => [b.id, b]));

  return {
    total: count,
    page:  parseInt(page, 10),
    pages: Math.ceil(count / parseInt(limit, 10)),
    data:  rows.map((r) => ({
      id:               r.id,
      userId:           r.user_id,
      userName:         userMap[r.user_id]?.name,
      userPhone:        userMap[r.user_id]?.phone,
      amount:           +parseFloat(r.amount).toFixed(2),
      grossAmount:      r.gross_amount ? +parseFloat(r.gross_amount).toFixed(2) : null,
      deductionPercent: r.deduction_percent,
      deductionAmount:  +parseFloat(r.deduction_amount).toFixed(2),
      status:           r.status,
      requestedAt:      r.requested_at,
      processedAt:      r.processed_at,
      rejectionReason:  r.rejection_reason,
      bankAccount:      bankMap[r.bank_account_id] || null,
    })),
  };
}

async function listPendingKyc({ page = 1, limit = 20, status = 'pending' } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where  = {};
  if (status && status !== 'all') where.status = status;

  const { count, rows } = await KycVerification.findAndCountAll({
    where,
    order: [['submitted_at', 'ASC']],
    limit:  parseInt(limit, 10),
    offset,
  });

  const userIds = rows.map((r) => r.user_id);
  const users = userIds.length
    ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'phone', 'email'] })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return {
    total: count,
    page:  parseInt(page, 10),
    pages: Math.ceil(count / parseInt(limit, 10)),
    data:  rows.map((k) => ({
      id:             k.id,
      userId:         k.user_id,
      userName:       userMap[k.user_id]?.name,
      userPhone:      userMap[k.user_id]?.phone,
      documentType:   k.document_type,
      documentNumber: k.document_number,
      status:         k.status,
      submittedAt:    k.submitted_at,
      frontImage:     k.front_image,
      backImage:      k.back_image,
      selfieWithId:   k.selfie_with_id,
    })),
  };
}

async function approveKyc(kycId, adminId) {
  const kyc = await KycVerification.findByPk(kycId);
  if (!kyc) throw new AppError('KYC record not found', 404);
  if (kyc.status !== 'pending') throw new AppError(`KYC is already ${kyc.status}`, 400);

  await kyc.update({
    status:      'verified',
    reviewed_at: new Date(),
    reviewed_by: adminId,
    rejection_reason: null,
  });

  return kyc;
}

async function rejectKyc(kycId, adminId, reason) {
  const kyc = await KycVerification.findByPk(kycId);
  if (!kyc) throw new AppError('KYC record not found', 404);
  if (kyc.status !== 'pending') throw new AppError(`KYC is already ${kyc.status}`, 400);

  await kyc.update({
    status:           'rejected',
    rejection_reason: reason,
    reviewed_at:      new Date(),
    reviewed_by:      adminId,
  });

  return kyc;
}

async function listTradingCodes({ page = 1, limit = 50, plan_id, day_number, code_type } = {}) {
  const where = {};
  if (plan_id)    where.plan_id    = plan_id;
  if (day_number) where.day_number = parseInt(day_number, 10);
  if (code_type)  where.code_type  = code_type;

  const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
  const pageNum  = parseInt(page, 10) || 1;
  const offset   = (pageNum - 1) * limitNum;

  const { count, rows } = await TradingCode.findAndCountAll({
    where,
    order:      [['plan_id', 'ASC'], ['day_number', 'ASC'], ['code_type', 'ASC']],
    limit:      limitNum,
    offset,
    attributes: ['id', 'plan_id', 'day_number', 'code_type', 'codes', 'slot_start', 'slot_end'],
  });

  return {
    total: count,
    page:  pageNum,
    pages: Math.ceil(count / limitNum),
    data:  rows.map((r) => ({
      id:        r.id,
      planId:    r.plan_id,
      dayNumber: r.day_number,
      codeType:  r.code_type,
      codeLabel: CODE_TYPE_LABEL[r.code_type] || r.code_type,
      codes:     parseCodes(r.codes),
      slot:      `${r.slot_start.slice(0, 5)} – ${r.slot_end.slice(0, 5)} IST`,
    })),
  };
}

async function getTradingCodesDayView(plan_id, day_number) {
  if (!plan_id || !day_number) {
    throw new AppError('plan_id and day_number are required', 422);
  }

  const day = parseInt(day_number, 10);
  const rows = await TradingCode.findAll({
    where:      { plan_id, day_number: day },
    order:      [['code_type', 'ASC']],
    attributes: ['id', 'plan_id', 'day_number', 'code_type', 'codes', 'slot_start', 'slot_end'],
  });

  if (rows.length === 0) {
    throw new AppError(`No codes found for ${plan_id} day ${day}`, 404);
  }

  return {
    planId:    plan_id,
    dayNumber: day,
    slots: rows.map((r) => ({
      id:        r.id,
      codeType:  r.code_type,
      codeLabel: CODE_TYPE_LABEL[r.code_type] || r.code_type,
      codes:     parseCodes(r.codes),
      slot:      `${r.slot_start.slice(0, 5)} – ${r.slot_end.slice(0, 5)} IST`,
    })),
  };
}

async function listCodeSubmissions({
  page = 1, limit = 30, user_id, search, plan_id, day_number, code_type, submission_date, credit_status,
} = {}) {
  const where = {};
  if (user_id)          where.user_id = user_id;
  if (plan_id)          where.plan_id = plan_id;
  if (day_number)       where.day_number = parseInt(day_number, 10);
  if (code_type)        where.code_type = code_type;
  if (submission_date)  where.submission_date = submission_date;
  if (credit_status === 'pending')  where.credited_at = null;
  if (credit_status === 'credited') where.credited_at = { [Op.ne]: null };

  if (search) {
    const users = await User.findAll({
      where: {
        role: { [Op.ne]: 'admin' },
        [Op.or]: [
          { name:  { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      },
      attributes: ['id'],
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      return { total: 0, page: 1, pages: 0, data: [], summary: { pending: 0, credited: 0 } };
    }
    where.user_id = user_id ? user_id : { [Op.in]: ids };
    if (user_id && !ids.includes(user_id)) {
      return { total: 0, page: 1, pages: 0, data: [], summary: { pending: 0, credited: 0 } };
    }
  }

  const limitNum = Math.min(parseInt(limit, 10) || 30, 100);
  const pageNum  = parseInt(page, 10) || 1;
  const offset   = (pageNum - 1) * limitNum;

  const { count, rows } = await CodeSubmission.findAndCountAll({
    where,
    order:      [['submitted_at', 'DESC']],
    limit:      limitNum,
    offset,
  });

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const users = userIds.length
    ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'phone'] })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const summaryWhere = { ...where };
  const [pendingCount, creditedCount, pendingSum, creditedSum] = await Promise.all([
    CodeSubmission.count({ where: { ...summaryWhere, credited_at: null } }),
    CodeSubmission.count({ where: { ...summaryWhere, credited_at: { [Op.ne]: null } } }),
    CodeSubmission.sum('profit_amount', { where: { ...summaryWhere, credited_at: null } }),
    CodeSubmission.sum('profit_amount', { where: { ...summaryWhere, credited_at: { [Op.ne]: null } } }),
  ]);

  return {
    summary: {
      pending:        pendingCount,
      credited:       creditedCount,
      pendingAmount:  +(parseFloat(pendingSum || 0)).toFixed(2),
      creditedAmount: +(parseFloat(creditedSum || 0)).toFixed(2),
    },
    total: count,
    page:  pageNum,
    pages: Math.ceil(count / limitNum),
    data:  rows.map((r) => ({
      id:              r.id,
      userId:          r.user_id,
      userName:        userMap[r.user_id]?.name,
      userPhone:       userMap[r.user_id]?.phone,
      planId:          r.plan_id,
      dayNumber:       r.day_number,
      codeType:        r.code_type,
      codeLabel:       CODE_TYPE_LABEL[r.code_type] || r.code_type,
      submittedCode:   r.submitted_code,
      profitAmount:    +parseFloat(r.profit_amount).toFixed(2),
      submissionDate:  r.submission_date,
      submittedAt:     r.submitted_at,
      creditedAt:      r.credited_at,
      creditStatus:    r.credited_at ? 'credited' : 'pending',
    })),
  };
}

module.exports = {
  getStats,
  listUsers,
  getUserDetail,
  updateUserStatus,
  listWithdrawals,
  listPendingKyc,
  approveKyc,
  rejectKyc,
  listTradingCodes,
  getTradingCodesDayView,
  listCodeSubmissions,
  approveWithdrawal: withdrawalService.approveWithdrawal,
  rejectWithdrawal:  withdrawalService.rejectWithdrawal,
};
