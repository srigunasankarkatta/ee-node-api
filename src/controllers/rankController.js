'use strict';

const rankService = require('../services/rankService');

exports.me = async (req, res) => {
  const data = await rankService.getMyRank(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.levels = async (req, res) => {
  const data = await rankService.getLevels();
  res.json({ success: true, status: 200, data });
};

exports.upgradeCheck = async (req, res) => {
  const data = await rankService.getUpgradeCheck(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.history = async (req, res) => {
  const data = await rankService.getRankHistory(req.user.id);
  res.json({ success: true, status: 200, data });
};
