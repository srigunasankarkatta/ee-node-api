'use strict';

const { body, validationResult } = require('express-validator');
const codeService = require('../services/codeService');
const codeSubmissionService = require('../services/codeSubmissionService');
const { AppError } = require('../middleware/errorHandler');

const today = async (req, res, next) => {
  try {
    const data = await codeService.getTodayCodes(req.user.id);
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

const welcome = async (req, res, next) => {
  try {
    const data = await codeService.fetchCode(req.user.id, 'welcome');
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

const regularAM = async (req, res, next) => {
  try {
    const data = await codeService.fetchCode(req.user.id, 'regular_am');
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

const regularPM = async (req, res, next) => {
  try {
    const data = await codeService.fetchCode(req.user.id, 'regular_pm');
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

const referral = async (req, res, next) => {
  try {
    const data = await codeService.fetchCode(req.user.id, 'referral');
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

// POST /codes/submit — user pastes a code → profit credited to wallet
const submit = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);

    const result = await codeSubmissionService.submitCode(req.user.id, req.body);

    res.json({
      success: true,
      status: 200,
      message: `✓ Code accepted — ₹${result.profitPending.toFixed(2)} will be credited to your wallet in 30 minutes (Day ${result.dayNumber} ${result.session} session)`,
      data: result,
    });
  } catch (err) { next(err); }
};

// GET /codes/submissions — user's past submission history
const submissionHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page, 10)  || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const data  = await codeSubmissionService.getSubmissionHistory(req.user.id, { page, limit });
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

module.exports = { today, welcome, regularAM, regularPM, referral, submit, submissionHistory };
