'use strict';

const referralService = require('../services/referralService');

exports.myCode = async (req, res) => {
  const data = referralService.getMyCode(req.user);
  res.json({ success: true, status: 200, data });
};

exports.team = async (req, res) => {
  const data = await referralService.getTeam(req.user.id, req.query);
  res.json({ success: true, status: 200, data });
};

exports.tree = async (req, res) => {
  const data = await referralService.getTree(req.user.id, req.query);
  res.json({ success: true, status: 200, data });
};

exports.teamStats = async (req, res) => {
  const data = await referralService.getTeamStats(req.user.id);
  res.json({ success: true, status: 200, data });
};
