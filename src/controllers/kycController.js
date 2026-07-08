'use strict';

const { validationResult } = require('express-validator');
const kycService = require('../services/kycService');
const { AppError } = require('../middleware/errorHandler');

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 422);
}

exports.getKycStatus = async (req, res) => {
  const data = await kycService.getKycStatus(req.user.id);
  res.json({ success: true, status: 200, data });
};

exports.submitKyc = async (req, res) => {
  validate(req);
  const data = await kycService.submitKyc(req.user.id, req.body, req.files || {});
  res.status(201).json({
    success: true,
    status:  201,
    message: 'KYC submitted successfully. Verification is under review.',
    data,
  });
};
