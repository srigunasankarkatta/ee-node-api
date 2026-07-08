const { Router } = require('express');
const { param, query } = require('express-validator');
const { getQuote, search, getMarketOverview } = require('../controllers/equityController');

const router = Router();

const validateSymbol = [
  param('symbol')
    .trim()
    .toUpperCase()
    .isAlphanumeric()
    .isLength({ min: 1, max: 10 })
    .withMessage('Symbol must be 1–10 alphanumeric characters'),
];

router.get('/market', getMarketOverview);
router.get('/search', query('q').notEmpty().withMessage('"q" is required'), search);
router.get('/quote/:symbol', validateSymbol, getQuote);

module.exports = router;
