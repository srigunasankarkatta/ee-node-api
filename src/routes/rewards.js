'use strict';

const { Router } = require('express');
const ctrl         = require('../controllers/rewardController');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../middleware/asyncHandler');

const router = Router();

router.use(authenticate);

router.get('/',             asyncHandler(ctrl.all));
router.get('/welcome-bonus', asyncHandler(ctrl.welcomeBonus));
router.get('/inviter',      asyncHandler(ctrl.inviter));
router.get('/superior',     asyncHandler(ctrl.superior));
router.get('/history',      asyncHandler(ctrl.history));

module.exports = router;
