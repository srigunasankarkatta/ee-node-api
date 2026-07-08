'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/profitController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

// GET /api/v1/profits
// Query params:
//   page    (default 1)
//   limit   (default 20)
//   status  "pending" | "credited" (omit for all)
router.get('/', ctrl.history);

module.exports = router;
