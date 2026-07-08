'use strict';

const { Router } = require('express');
const { body }   = require('express-validator');
const ctrl       = require('../controllers/kycController');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../middleware/asyncHandler');
const { kycUpload }    = require('../middleware/upload');

const router = Router();

router.use(authenticate);

router.get('/status', asyncHandler(ctrl.getKycStatus));

router.post('/submit',
  kycUpload.fields([
    { name: 'front_image',    maxCount: 1 },
    { name: 'back_image',     maxCount: 1 },
    { name: 'selfie_with_id', maxCount: 1 },
  ]),
  body('document_type')
    .isIn(['pan', 'aadhaar', 'voter_id', 'driving_license'])
    .withMessage('document_type must be one of: pan, aadhaar, voter_id, driving_license'),
  body('document_number')
    .trim()
    .notEmpty()
    .withMessage('document_number is required'),
  asyncHandler(ctrl.submitKyc)
);

module.exports = router;
