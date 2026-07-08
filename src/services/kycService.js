'use strict';

const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const KycVerification = require('../models/KycVerification');
const { AppError }    = require('../middleware/errorHandler');

const ALLOWED_DOCUMENTS = [
  { type: 'pan',              label: 'PAN Card' },
  { type: 'aadhaar',          label: 'Aadhaar Card' },
  { type: 'voter_id',         label: 'Voter ID' },
  { type: 'driving_license',  label: 'Driving License' },
];

async function getKycStatus(userId) {
  const kyc = await KycVerification.findOne({ where: { user_id: userId } });

  if (!kyc) {
    return {
      status:           'not_started',
      allowedDocuments: ALLOWED_DOCUMENTS,
      requiredUploads:  ['front_image', 'back_image', 'selfie_with_id'],
    };
  }

  return {
    status:           kyc.status,
    documentType:     kyc.document_type,
    submittedAt:      kyc.submitted_at,
    reviewedAt:       kyc.reviewed_at,
    rejectionReason:  kyc.rejection_reason || null,
    allowedDocuments: ALLOWED_DOCUMENTS,
    requiredUploads:  ['front_image', 'back_image', 'selfie_with_id'],
  };
}

async function submitKyc(userId, { document_type, document_number }, files) {
  const existing = await KycVerification.findOne({ where: { user_id: userId } });

  if (existing && existing.status === 'verified') {
    throw new AppError('KYC is already verified', 400);
  }
  if (existing && existing.status === 'pending') {
    throw new AppError('KYC is already submitted and under review', 400);
  }

  const frontImage   = files.front_image?.[0];
  const backImage    = files.back_image?.[0];
  const selfieImage  = files.selfie_with_id?.[0];

  if (!frontImage || !backImage || !selfieImage) {
    throw new AppError('front_image, back_image, and selfie_with_id are all required', 400);
  }

  // Store relative paths from project root
  const toRelative = (f) => path.join('uploads', 'kyc', userId, f.filename).replace(/\\/g, '/');

  if (existing) {
    await existing.update({
      document_type,
      document_number,
      front_image:    toRelative(frontImage),
      back_image:     toRelative(backImage),
      selfie_with_id: toRelative(selfieImage),
      status:         'pending',
      rejection_reason: null,
      submitted_at:   new Date(),
      reviewed_at:    null,
      reviewed_by:    null,
    });
    return { kycId: existing.id, status: 'pending' };
  }

  const kyc = await KycVerification.create({
    id:             uuidv4(),
    user_id:        userId,
    document_type,
    document_number,
    front_image:    toRelative(frontImage),
    back_image:     toRelative(backImage),
    selfie_with_id: toRelative(selfieImage),
    status:         'pending',
    submitted_at:   new Date(),
  });

  return { kycId: kyc.id, status: 'pending' };
}

module.exports = { getKycStatus, submitKyc };
