'use strict';

const { Router } = require('express');
const ctrl         = require('../controllers/referralController');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../middleware/asyncHandler');

const router = Router();

router.use(authenticate);

router.get('/my-code',    asyncHandler(ctrl.myCode));
router.get('/team',       asyncHandler(ctrl.team));
router.get('/tree',       asyncHandler(ctrl.tree));
router.get('/team/stats', asyncHandler(ctrl.teamStats));

module.exports = router;
