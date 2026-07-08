'use strict';

const { Router }   = require('express');
const ctrl         = require('../controllers/meController');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../middleware/asyncHandler');

const router = Router();

router.use(authenticate);

router.get('/active-plan', asyncHandler(ctrl.getActivePlan));

module.exports = router;
