'use strict';

const { validationResult } = require('express-validator');
const adminService = require('../services/adminService');
const { AppError } = require('../middleware/errorHandler');

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);
}

exports.stats = async (req, res) => {
  const data = await adminService.getStats();
  res.json({ success: true, status: 200, data });
};

exports.listUsers = async (req, res) => {
  const data = await adminService.listUsers(req.query);
  res.json({ success: true, status: 200, data });
};

exports.getUser = async (req, res) => {
  const data = await adminService.getUserDetail(req.params.id);
  res.json({ success: true, status: 200, data });
};

exports.updateUserStatus = async (req, res) => {
  validate(req);
  const data = await adminService.updateUserStatus(req.params.id, req.body.status);
  res.json({ success: true, status: 200, message: 'User status updated', data });
};

exports.listWithdrawals = async (req, res) => {
  const data = await adminService.listWithdrawals(req.query);
  res.json({ success: true, status: 200, data });
};

exports.approveWithdrawal = async (req, res) => {
  const data = await adminService.approveWithdrawal(req.params.id, req.user.id);
  res.json({ success: true, status: 200, message: 'Withdrawal approved and marked as processed', data });
};

exports.rejectWithdrawal = async (req, res) => {
  validate(req);
  const data = await adminService.rejectWithdrawal(req.params.id, req.user.id, req.body.reason);
  res.json({ success: true, status: 200, message: 'Withdrawal rejected and amount reversed to user wallet', data });
};

exports.listKyc = async (req, res) => {
  const data = await adminService.listPendingKyc(req.query);
  res.json({ success: true, status: 200, data });
};

exports.approveKyc = async (req, res) => {
  const data = await adminService.approveKyc(req.params.id, req.user.id);
  res.json({ success: true, status: 200, message: 'KYC verified', data });
};

exports.rejectKyc = async (req, res) => {
  validate(req);
  const data = await adminService.rejectKyc(req.params.id, req.user.id, req.body.reason);
  res.json({ success: true, status: 200, message: 'KYC rejected', data });
};

exports.listTradingCodes = async (req, res) => {
  const data = await adminService.listTradingCodes(req.query);
  res.json({ success: true, status: 200, data });
};

exports.getTradingCodesDayView = async (req, res) => {
  const data = await adminService.getTradingCodesDayView(req.query.plan_id, req.query.day_number);
  res.json({ success: true, status: 200, data });
};

exports.listCodeSubmissions = async (req, res) => {
  const data = await adminService.listCodeSubmissions(req.query);
  res.json({ success: true, status: 200, data });
};
