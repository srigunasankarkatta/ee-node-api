'use strict';

const { Router } = require('express');
const ctrl         = require('../controllers/rankController');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../middleware/asyncHandler');

const router = Router();

router.use(authenticate);

router.get('/me',            asyncHandler(ctrl.me));
router.get('/levels',        asyncHandler(ctrl.levels));
router.get('/upgrade-check', asyncHandler(ctrl.upgradeCheck));
router.get('/history',       asyncHandler(ctrl.history));

module.exports = router;
