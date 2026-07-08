'use strict';

const UserPlan = require('../models/UserPlan');
const Plan     = require('../models/Plan');

exports.getActivePlan = async (req, res) => {
  const userPlan = await UserPlan.findOne({
    where: { user_id: req.user.id, status: 'active' },
  });

  if (!userPlan) {
    return res.json({ success: true, status: 200, data: null });
  }

  const plan = await Plan.findByPk(userPlan.plan_id);
  const principal = parseFloat(plan.principal);
  const now       = new Date();

  const lockedUntil = userPlan.locked_until ? new Date(userPlan.locked_until) : null;
  const isLocked    = lockedUntil ? now < lockedUntil : false;
  const daysRemaining = isLocked
    ? Math.ceil((lockedUntil - now) / (1000 * 60 * 60 * 24))
    : 0;

  return res.json({
    success: true,
    status:  200,
    data: {
      planId:            userPlan.plan_id,
      planName:          plan.name,
      principal,
      tenureMonths:      userPlan.tenure_months,
      multiplier:        userPlan.multiplier,
      projectedBenefit:  userPlan.multiplier ? principal * userPlan.multiplier : null,
      subscribedAt:      userPlan.subscribed_at,
      lockedUntil:       userPlan.locked_until,
      expiresAt:         userPlan.expires_at,
      isLocked,
      daysRemaining,
      creditedThroughDay: userPlan.credited_through_day,
    },
  });
};
