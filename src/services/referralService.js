'use strict';

const { Op } = require('sequelize');
const Referral = require('../models/Referral');
const User     = require('../models/User');
const UserPlan = require('../models/UserPlan');
const UserRank = require('../models/UserRank');
const config   = require('../config');

async function getHighestRankId(userId) {
  const rows = await UserRank.findAll({
    where: {
      user_id: userId,
      status:  { [Op.in]: ['active', 'completed'] },
    },
    attributes: ['rank_id'],
  });
  if (!rows.length) return null;
  const maxLevel = Math.max(...rows.map((r) => parseInt(r.rank_id.replace('L', ''), 10)));
  return `L${maxLevel}`;
}

async function formatTeamMember(ref) {
  const invitee = await User.findByPk(ref.invitee_id, {
    attributes: ['id', 'name', 'phone', 'joined_at', 'role', 'status'],
  });
  if (!invitee) return null;

  const activePlan = await UserPlan.findOne({
    where: { user_id: ref.invitee_id, status: 'active' },
    attributes: ['plan_id', 'subscribed_at'],
    order: [['subscribed_at', 'DESC']],
  });

  const rankId = await getHighestRankId(ref.invitee_id);

  return {
    userId:       invitee.id,
    name:         invitee.name,
    phone:        invitee.phone,
    joinedAt:     invitee.joined_at,
    role:         invitee.role,
    accountStatus: invitee.status,
    referralStatus: ref.status,
    planId:       activePlan ? activePlan.plan_id : null,
    subscribedAt: activePlan ? activePlan.subscribed_at : null,
    rankId,
    isActive:     Boolean(activePlan),
  };
}

function getMyCode(user) {
  const code = user.referral_code;
  return {
    referral_code: code,
    share_link:    `${config.appUrl}/register?ref=${code}`,
    share_message: `Join me on Xceed! Use my referral code: ${code}`,
  };
}

async function getTeam(userId, { page = 1, limit = 20 } = {}) {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const { count, rows } = await Referral.findAndCountAll({
    where:   { inviter_id: userId },
    order:   [['created_at', 'DESC']],
    limit:   parseInt(limit, 10),
    offset,
  });

  const members = [];
  for (const ref of rows) {
    const member = await formatTeamMember(ref);
    if (member) members.push(member);
  }

  return {
    total:  count,
    page:   parseInt(page, 10),
    pages:  Math.ceil(count / parseInt(limit, 10)),
    data:   members,
  };
}

async function getTeamStats(userId) {
  const refs = await Referral.findAll({ where: { inviter_id: userId } });
  const inviteeIds = refs.map((r) => r.invitee_id);

  if (inviteeIds.length === 0) {
    return {
      totalDirect:    0,
      activeMembers:  0,
      pendingMembers: 0,
      byPlan:         {},
      byRank:         {},
    };
  }

  const activePlans = await UserPlan.findAll({
    where: { user_id: { [Op.in]: inviteeIds }, status: 'active' },
    attributes: ['user_id', 'plan_id'],
  });

  const activeUserIds = new Set(activePlans.map((p) => p.user_id));
  const byPlan = {};
  for (const p of activePlans) {
    byPlan[p.plan_id] = (byPlan[p.plan_id] || 0) + 1;
  }

  const ranks = await UserRank.findAll({
    where: {
      user_id: { [Op.in]: inviteeIds },
      status:  { [Op.in]: ['active', 'completed'] },
    },
    attributes: ['user_id', 'rank_id'],
  });

  const byRank = {};
  const rankedUsers = new Set();
  for (const r of ranks) {
    rankedUsers.add(r.user_id);
    byRank[r.rank_id] = (byRank[r.rank_id] || 0) + 1;
  }

  return {
    totalDirect:    refs.length,
    activeMembers:  activeUserIds.size,
    pendingMembers: refs.length - activeUserIds.size,
    byPlan,
    byRank,
  };
}

async function buildTreeNode(userId, depth, maxDepth) {
  if (depth >= maxDepth) return [];

  const refs = await Referral.findAll({
    where:   { inviter_id: userId },
    order:   [['created_at', 'ASC']],
  });

  const nodes = [];
  for (const ref of refs) {
    const member = await formatTeamMember(ref);
    if (!member) continue;

    nodes.push({
      ...member,
      level:    depth + 1,
      children: await buildTreeNode(ref.invitee_id, depth + 1, maxDepth),
    });
  }
  return nodes;
}

async function getTree(userId, { maxDepth = 5 } = {}) {
  const depth = Math.min(Math.max(parseInt(maxDepth, 10) || 5, 1), 10);
  const tree  = await buildTreeNode(userId, 0, depth);

  return {
    maxDepth: depth,
    totalNodes: countNodes(tree),
    tree,
  };
}

function countNodes(nodes) {
  let count = nodes.length;
  for (const node of nodes) {
    count += countNodes(node.children || []);
  }
  return count;
}

module.exports = { getMyCode, getTeam, getTeamStats, getTree };
