const config = require('../config');

const healthCheck = (req, res) => {
  res.json({
    success: true,
    status: 200,
    message: 'equity-eyes API is running',
    data: {
      environment: config.env,
      version: config.apiVersion,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
    },
  });
};

module.exports = { healthCheck };
