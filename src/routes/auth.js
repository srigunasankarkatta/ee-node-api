'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().isMobilePhone().withMessage('Valid phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('referral_code').optional().trim(),
  ctrl.register
);

router.post('/send-otp',
  body('phone').trim().isMobilePhone().withMessage('Valid phone number required'),
  ctrl.sendOTP
);

router.post('/verify-otp',
  body('phone').trim().notEmpty(),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ctrl.verifyOTP
);

router.post('/login',
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  ctrl.login
);

router.post('/refresh-token', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
