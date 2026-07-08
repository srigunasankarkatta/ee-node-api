'use strict';

const { validationResult } = require('express-validator');
const planService = require('../services/planService');
const { AppError } = require('../middleware/errorHandler');

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);
}

const listPlans = async (req, res, next) => {
  try {
    const plans = await planService.listPlans();
    res.json({ success: true, status: 200, data: plans });
  } catch (err) { next(err); }
};

const getPlan = async (req, res, next) => {
  try {
    const plan = await planService.getPlan(req.params.planId.toUpperCase());
    res.json({ success: true, status: 200, data: plan });
  } catch (err) { next(err); }
};

const getProjection = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.days, 10) || 60, 365);
    const rows = await planService.getProjection(req.params.planId.toUpperCase(), limit);
    res.json({ success: true, status: 200, data: rows });
  } catch (err) { next(err); }
};

const subscribe = async (req, res, next) => {
  try {
    validate(req);
    const tenureMonths = parseInt(req.body.tenure_months, 10);
    const result = await planService.subscribe(
      req.user.id,
      req.params.planId.toUpperCase(),
      tenureMonths
    );
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Plan activated. Welcome bonus credited.',
      data: result,
    });
  } catch (err) { next(err); }
};

module.exports = { listPlans, getPlan, getProjection, subscribe };
