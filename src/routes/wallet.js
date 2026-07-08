'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/walletController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

// All wallet routes require auth
router.use(authenticate);

// ── Wallet ───────────────────────────────────────────────────────────────────
router.get('/balance',      asyncHandler(ctrl.getBalance));
router.get('/transactions', asyncHandler(ctrl.getTransactions));
router.get('/summary',      asyncHandler(ctrl.getSummary));

// ── Bank Accounts ─────────────────────────────────────────────────────────────
router.get('/bank-accounts', asyncHandler(ctrl.getBankAccounts));

router.post('/bank-accounts',
  body('account_holder').trim().notEmpty().withMessage('Account holder name is required'),
  body('account_number').trim().notEmpty().withMessage('Account number is required'),
  // Auto-uppercase before regex so users can type lowercase IFSC
  body('ifsc_code').trim().customSanitizer((v) => v.toUpperCase())
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code (e.g. SBIN0001234)'),
  body('bank_name').trim().notEmpty().withMessage('Bank name is required'),
  asyncHandler(ctrl.addBankAccount)
);

router.patch('/bank-accounts/:id/primary', asyncHandler(ctrl.setPrimaryBankAccount));
router.delete('/bank-accounts/:id',        asyncHandler(ctrl.deleteBankAccount));

// ── Withdrawals ───────────────────────────────────────────────────────────────
router.get('/withdrawals', asyncHandler(ctrl.getWithdrawals));

router.post('/withdraw/preview',
  body('amount').isFloat({ min: 100 }).withMessage('Minimum withdrawal is ₹100'),
  asyncHandler(ctrl.previewWithdrawal)
);

router.post('/withdraw',
  body('amount').isFloat({ min: 100 }).withMessage('Minimum withdrawal is ₹100'),
  body('accept_early_withdrawal_deduction').optional().isBoolean().toBoolean(),
  asyncHandler(ctrl.requestWithdrawal)
);

router.delete('/withdrawals/:id', asyncHandler(ctrl.cancelWithdrawal));

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/withdrawals',               requireAdmin, asyncHandler(ctrl.getAllPendingWithdrawals));
router.patch('/admin/withdrawals/:id/approve', requireAdmin, asyncHandler(ctrl.approveWithdrawal));

router.patch('/admin/withdrawals/:id/reject',
  requireAdmin,
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  asyncHandler(ctrl.rejectWithdrawal)
);

module.exports = router;
