'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const User = require('../models/User');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// In-memory OTP store — replace with Redis in production
const otpStore = new Map();

function generateReferralCode(name) {
  const prefix = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${suffix}`;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signTokens(userId) {
  const accessToken = jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

async function register({ name, phone, email, password, referral_code }) {
  const existing = await User.findOne({
    where: { [Op.or]: [{ phone }, ...(email ? [{ email }] : [])] },
  });
  if (existing) throw new AppError('Phone or email already registered', 409);

  let referredBy = null;
  if (referral_code) {
    const inviter = await User.findOne({ where: { referral_code } });
    if (!inviter) throw new AppError('Invalid referral code', 400);
    referredBy = inviter.id;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  const myReferralCode = generateReferralCode(name);

  const user = await User.create({
    id:            userId,
    name,
    phone,
    email:         email || null,
    password_hash,
    referral_code: myReferralCode,
    referred_by:   referredBy,
    joined_at:      new Date(),
    status:         'active',
    phone_verified: 1,
    role:           'new_joiner',
  });

  // Create referral record if applicable
  if (referredBy) {
    const Referral = require('../models/Referral');
    const inviter = await User.findByPk(referredBy);
    await Referral.create({
      id:          uuidv4(),
      inviter_id:  referredBy,
      invitee_id:  userId,
      superior_id: inviter.referred_by || null,
      status:      'pending',
    });
  }

  return { userId: user.id, referral_code: myReferralCode };
}

async function sendOTP(phone) {
  const user = await User.findOne({ where: { phone } });
  if (!user) throw new AppError('No account found with this phone number', 404);

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(phone, { otp, expiresAt, userId: user.id });

  // TODO: integrate SMS provider (Twilio / MSG91) to send otp
  logger.info(`OTP for ${phone}: ${otp}`);

  return { message: 'OTP sent successfully' };
}

async function verifyOTP(phone, otp) {
  const record = otpStore.get(phone);
  if (!record) throw new AppError('OTP not found or expired', 400);
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    throw new AppError('OTP expired', 400);
  }
  if (record.otp !== otp) throw new AppError('Invalid OTP', 400);

  otpStore.delete(phone);

  await User.update(
    { phone_verified: 1, status: 'active' },
    { where: { id: record.userId } }
  );

  const tokens = signTokens(record.userId);
  return { ...tokens, userId: record.userId };
}

async function login({ phone, password }) {
  const user = await User.findOne({ where: { phone } });
  if (!user) throw new AppError('Invalid credentials', 401);
  if (user.status === 'frozen') throw new AppError('Account frozen due to policy violation', 403);
  if (user.status === 'suspended') throw new AppError('Account suspended. Contact support.', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  await User.update({ last_login: new Date() }, { where: { id: user.id } });

  const tokens = signTokens(user.id);
  return {
    ...tokens,
    user: {
      id:   user.id,
      name: user.name,
      role: user.role,
      referral_code: user.referral_code,
    },
  };
}

async function refreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  if (payload.type !== 'refresh') throw new AppError('Invalid token type', 401);

  const user = await User.findByPk(payload.sub);
  if (!user || user.status === 'frozen') throw new AppError('User not found or frozen', 401);

  return signTokens(user.id);
}

module.exports = { register, sendOTP, verifyOTP, login, refreshToken };
