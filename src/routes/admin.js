'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', asyncHandler(ctrl.stats));

router.get('/users',     asyncHandler(ctrl.listUsers));
router.get('/users/:id', asyncHandler(ctrl.getUser));
router.patch('/users/:id/status',
  body('status').isIn(['active', 'suspended', 'frozen']).withMessage('Invalid status'),
  asyncHandler(ctrl.updateUserStatus)
);

router.get('/withdrawals', asyncHandler(ctrl.listWithdrawals));
router.patch('/withdrawals/:id/approve', asyncHandler(ctrl.approveWithdrawal));
router.patch('/withdrawals/:id/reject',
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  asyncHandler(ctrl.rejectWithdrawal)
);

router.get('/kyc', asyncHandler(ctrl.listKyc));
router.patch('/kyc/:id/approve', asyncHandler(ctrl.approveKyc));
router.patch('/kyc/:id/reject',
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  asyncHandler(ctrl.rejectKyc)
);

router.get('/codes/trading',        asyncHandler(ctrl.listTradingCodes));
router.get('/codes/trading/day',    asyncHandler(ctrl.getTradingCodesDayView));
router.get('/codes/submissions',   asyncHandler(ctrl.listCodeSubmissions));

module.exports = router;
