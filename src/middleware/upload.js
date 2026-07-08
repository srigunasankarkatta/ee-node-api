'use strict';

const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { AppError } = require('./errorHandler');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_MB  = 5;

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'kyc', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400));
  }
}

const kycUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

module.exports = { kycUpload };
