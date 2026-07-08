'use strict';

const rewardService = require('../services/rewardService');

exports.all = async (req, res) => {
  const data = await rewardService.getAllRewards(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.welcomeBonus = async (req, res) => {
  const data = await rewardService.getWelcomeBonus(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.inviter = async (req, res) => {
  const data = await rewardService.getInviterRewards(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.superior = async (req, res) => {
  const data = await rewardService.getSuperiorRewards(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.history = async (req, res) => {
  const data = await rewardService.getRewardHistory(req.user.id, req.query);
  res.json({ success: true, status: 200, data });
};
