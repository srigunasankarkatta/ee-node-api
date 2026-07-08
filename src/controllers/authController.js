'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);
};

const register = async (req, res, next) => {
  try {
    handleValidation(req);
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, status: 201, message: 'Registration successful. Please verify your phone number.', data: result });
  } catch (err) { next(err); }
};

const sendOTP = async (req, res, next) => {
  try {
    handleValidation(req);
    const result = await authService.sendOTP(req.body.phone);
    res.json({ success: true, status: 200, ...result });
  } catch (err) { next(err); }
};

const verifyOTP = async (req, res, next) => {
  try {
    handleValidation(req);
    const { phone, otp } = req.body;
    const result = await authService.verifyOTP(phone, otp);
    res.json({ success: true, status: 200, message: 'Phone verified. Login successful.', data: result });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    handleValidation(req);
    const result = await authService.login(req.body);
    res.json({ success: true, status: 200, message: 'Login successful', data: result });
  } catch (err) { next(err); }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new AppError('refresh_token is required', 400);
    const tokens = await authService.refreshToken(refresh_token);
    res.json({ success: true, status: 200, data: tokens });
  } catch (err) { next(err); }
};

const logout = (req, res) => {
  // Client must discard both tokens.
  // Stateless JWT — add token blacklist (Redis) if needed for server-side invalidation.
  res.json({ success: true, status: 200, message: 'Logged out successfully' });
};

const me = (req, res) => {
  const { id, name, role, status, referral_code, wallet_balance, joined_at } = req.user;
  res.json({ success: true, status: 200, data: { id, name, role, status, referral_code, wallet_balance, joined_at } });
};

module.exports = { register, sendOTP, verifyOTP, login, refreshToken, logout, me };
