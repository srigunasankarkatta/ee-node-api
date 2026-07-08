'use strict';

const profitService = require('../services/profitService');

const history = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const data = await profitService.getProfitHistory(req.user.id, { page, limit, status });
    res.json({ success: true, status: 200, data });
  } catch (err) { next(err); }
};

module.exports = { history };
