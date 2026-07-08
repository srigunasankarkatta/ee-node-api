'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/codeController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All code routes require login
router.use(authenticate);

// ── View today's slot schedule ────────────────────────────────────────────────
router.get('/today',        ctrl.today);

// ── Fetch published codes (view only, does NOT credit profit) ─────────────────
router.get('/welcome',      ctrl.welcome);      // 10:00–10:15 IST · new joiners · days 1–5
router.get('/regular/am',   ctrl.regularAM);    // 11:00–11:15 IST · all members
router.get('/regular/pm',   ctrl.regularPM);    // 14:00–14:15 IST · all members
router.get('/referral',     ctrl.referral);     // 15:00–15:15 IST · existing members (day 6+)

// ── Submit a code → validates + credits profit to wallet ──────────────────────
// code_type must match the active time window when the request is made
router.post('/submit',
  body('code')
    .trim()
    .notEmpty().withMessage('code is required')
    .isLength({ max: 100 }).withMessage('code is too long'),
  body('code_type')
    .isIn(['welcome', 'regular_am', 'regular_pm', 'referral'])
    .withMessage('code_type must be one of: welcome, regular_am, regular_pm, referral'),
  ctrl.submit
);

// ── Submission history ────────────────────────────────────────────────────────
router.get('/submissions',  ctrl.submissionHistory);

module.exports = router;
