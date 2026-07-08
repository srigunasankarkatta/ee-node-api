'use strict';

const { Router } = require('express');
const healthRoutes  = require('./health');
const authRoutes    = require('./auth');
const planRoutes    = require('./plans');
const codeRoutes    = require('./codes');
const walletRoutes  = require('./wallet');
const kycRoutes     = require('./kyc');
const meRoutes      = require('./me');
const profitRoutes  = require('./profits');
const referralRoutes = require('./referral');
const rankRoutes    = require('./rank');
const rewardRoutes  = require('./rewards');
const adminRoutes   = require('./admin');

const router = Router();

router.use('/health',  healthRoutes);
router.use('/auth',    authRoutes);
router.use('/plans',   planRoutes);
router.use('/codes',   codeRoutes);
router.use('/wallet',  walletRoutes);
router.use('/kyc',     kycRoutes);
router.use('/me',      meRoutes);
router.use('/profits', profitRoutes);
router.use('/referral', referralRoutes);
router.use('/rank',    rankRoutes);
router.use('/rewards', rewardRoutes);
router.use('/admin',   adminRoutes);

module.exports = router;
