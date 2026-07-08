'use strict';

const { Op } = require('sequelize');
const CodeSubmission = require('../models/CodeSubmission');

const CREDIT_DELAY_MS = 30 * 60 * 1000;

const CODE_TYPE_LABEL = {
  welcome:    'Welcome Code',
  regular_am: 'AM Regular Code',
  regular_pm: 'PM Regular Code',
  referral:   'Referral Code',
};

async function getProfitHistory(userId, { page = 1, limit = 20, status } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const where = { user_id: userId };
  if (status === 'pending')  where.credited_at = null;
  if (status === 'credited') where.credited_at = { [Op.ne]: null };

  const { count, rows } = await CodeSubmission.findAndCountAll({
    where,
    order:      [['submitted_at', 'DESC']],
    limit:      parseInt(limit, 10),
    offset,
    attributes: [
      'id', 'plan_id', 'day_number', 'code_type',
      'profit_amount', 'submission_date',
      'submitted_at', 'credited_at',
    ],
  });

  // Summary counts (always across ALL pages, not just the current page)
  const allRows = await CodeSubmission.findAll({
    where:      { user_id: userId },
    attributes: ['profit_amount', 'credited_at'],
  });

  let totalCredited = 0;
  let totalPending  = 0;
  let pendingCount  = 0;

  for (const r of allRows) {
    const amt = parseFloat(r.profit_amount);
    if (r.credited_at) {
      totalCredited += amt;
    } else {
      totalPending += amt;
      pendingCount++;
    }
  }

  const data = rows.map((r) => {
    const isPending   = !r.credited_at;
    const creditAfter = isPending
      ? new Date(new Date(r.submitted_at).getTime() + CREDIT_DELAY_MS).toISOString()
      : null;

    return {
      id:            r.id,
      date:          r.submission_date,
      day_number:    r.day_number,
      plan_id:       r.plan_id,
      code_type:     r.code_type,
      code_label:    CODE_TYPE_LABEL[r.code_type] || r.code_type,
      profit_amount: +(parseFloat(r.profit_amount)).toFixed(2),
      status:        isPending ? 'pending' : 'credited',
      submitted_at:  r.submitted_at,
      credited_at:   r.credited_at || null,
      credit_after:  creditAfter,
    };
  });

  return {
    summary: {
      total_credited: +totalCredited.toFixed(2),
      total_pending:  +totalPending.toFixed(2),
      pending_count:  pendingCount,
    },
    total:  count,
    page:   parseInt(page, 10),
    pages:  Math.ceil(count / parseInt(limit, 10)),
    data,
  };
}

module.exports = { getProfitHistory };
