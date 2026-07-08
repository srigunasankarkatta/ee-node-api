const axios = require('axios');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

const getQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;

    // Placeholder: wire up your preferred market data provider here
    // e.g. Alpha Vantage, Polygon.io, Yahoo Finance, etc.
    if (!config.marketApi.baseUrl || !config.marketApi.key) {
      return res.json({
        success: true,
        status: 200,
        message: 'Market API not configured — returning mock data',
        data: {
          symbol: symbol.toUpperCase(),
          price: 150.25,
          change: 2.35,
          changePercent: 1.59,
          volume: 32450000,
          marketCap: '2.4T',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const response = await axios.get(`${config.marketApi.baseUrl}/quote`, {
      params: { symbol, apikey: config.marketApi.key },
    });

    res.json({ success: true, status: 200, data: response.data });
  } catch (err) {
    next(err);
  }
};

const search = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return next(new AppError('Query parameter "q" is required', 400));
    }

    // Placeholder mock results
    res.json({
      success: true,
      status: 200,
      data: [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      ],
    });
  } catch (err) {
    next(err);
  }
};

const getMarketOverview = async (req, res, next) => {
  try {
    res.json({
      success: true,
      status: 200,
      data: {
        indices: [
          { name: 'S&P 500', value: 5321.41, change: 0.58 },
          { name: 'NASDAQ', value: 16832.92, change: 0.94 },
          { name: 'DOW JONES', value: 38596.98, change: 0.32 },
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getQuote, search, getMarketOverview };
