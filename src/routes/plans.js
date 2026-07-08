'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/planController');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

// Public — anyone can browse plans before registering
router.get('/',                    ctrl.listPlans);
router.get('/:planId',             ctrl.getPlan);
router.get('/:planId/projection',  ctrl.getProjection);

// Requires login — subscribe to a plan (first recharge)
router.post('/:planId/subscribe',
  authenticate,
  body('tenure_months')
    .isInt({ allowedValues: [9, 18, 27, 36] })
    .withMessage('tenure_months must be one of: 9, 18, 27, 36'),
  asyncHandler(ctrl.subscribe)
);

module.exports = router;
