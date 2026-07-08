'use strict';

const { validationResult } = require('express-validator');
const walletService      = require('../services/walletService');
const withdrawalService  = require('../services/withdrawalService');
const { AppError }       = require('../middleware/errorHandler');

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);
}

// ── Wallet ───────────────────────────────────────────────────────────────────

exports.getBalance = async (req, res) => {
  const data = await walletService.getBalance(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.getTransactions = async (req, res) => {
  const data = await walletService.getTransactions(req.user.id, req.query);
  res.json({ success: true, status: 200, data });
};

exports.getSummary = async (req, res) => {
  const data = await walletService.getSummary(req.user.id);
  res.json({ success: true, status: 200, data });
};

// ── Bank Accounts ────────────────────────────────────────────────────────────

exports.addBankAccount = async (req, res) => {
  validate(req);
  const data = await withdrawalService.addBankAccount(req.user.id, req.body);
  res.status(201).json({ success: true, status: 201, message: 'Bank account added', data });
};

exports.getBankAccounts = async (req, res) => {
  const data = await withdrawalService.getBankAccounts(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.setPrimaryBankAccount = async (req, res) => {
  const data = await withdrawalService.setPrimaryBankAccount(req.user.id, req.params.id);
  res.json({ success: true, status: 200, message: 'Primary bank account updated', data });
};

exports.deleteBankAccount = async (req, res) => {
  await withdrawalService.deleteBankAccount(req.user.id, req.params.id);
  res.json({ success: true, status: 200, message: 'Bank account removed' });
};

// ── Withdrawals ──────────────────────────────────────────────────────────────

exports.previewWithdrawal = async (req, res) => {
  validate(req);
  const data = await withdrawalService.previewWithdrawal(req.user.id, parseFloat(req.body.amount));
  res.json({ success: true, status: 200, data });
};

exports.requestWithdrawal = async (req, res) => {
  validate(req);
  const acceptEarly = req.body.accept_early_withdrawal_deduction === true;
  const data = await withdrawalService.requestWithdrawal(
    req.user.id,
    parseFloat(req.body.amount),
    acceptEarly
  );
  res.status(201).json({ success: true, status: 201, message: 'Withdrawal request submitted', data });
};

exports.getWithdrawals = async (req, res) => {
  const data = await withdrawalService.getWithdrawals(req.user.id, req.query);
  res.json({ success: true, status: 200, data });
};

exports.cancelWithdrawal = async (req, res) => {
  await withdrawalService.cancelWithdrawal(req.user.id, req.params.id);
  res.json({ success: true, status: 200, message: 'Withdrawal request cancelled and amount reversed' });
};

// ── Admin ────────────────────────────────────────────────────────────────────

exports.getAllPendingWithdrawals = async (req, res) => {
  const data = await withdrawalService.getAllPendingWithdrawals(req.query);
  res.json({ success: true, status: 200, data });
};

exports.approveWithdrawal = async (req, res) => {
  const data = await withdrawalService.approveWithdrawal(req.params.id, req.user.id);
  res.json({ success: true, status: 200, message: 'Withdrawal approved and marked as processed', data });
};

exports.rejectWithdrawal = async (req, res) => {
  validate(req);
  const data = await withdrawalService.rejectWithdrawal(req.params.id, req.user.id, req.body.reason);
  res.json({ success: true, status: 200, message: 'Withdrawal rejected and amount reversed to user wallet', data });
};
