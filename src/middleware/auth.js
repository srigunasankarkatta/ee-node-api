'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required', 401));
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findByPk(payload.sub, {
    attributes: ['id', 'name', 'role', 'status', 'referral_code', 'referred_by', 'joined_at', 'phone_verified', 'wallet_balance'],
  });
  if (!user) return next(new AppError('User not found', 401));
  if (user.status === 'frozen') return next(new AppError('Account frozen', 403));
  if (user.status === 'suspended') return next(new AppError('Account suspended', 403));

  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return next(new AppError('Admin access required', 403));
  next();
};

const requireActivePlan = async (req, res, next) => {
  const UserPlan = require('../models/UserPlan');
  const plan = await UserPlan.findOne({
    where: { user_id: req.user.id, status: 'active' },
  });
  if (!plan) return next(new AppError('Active plan required to access this resource', 403));
  req.userPlan = plan;
  next();
};

module.exports = { authenticate, requireAdmin, requireActivePlan };
