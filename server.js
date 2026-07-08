require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/config/logger');
const { connectDB } = require('./src/config/database');
const { startScheduler } = require('./src/jobs/scheduler');
const { publishDailyCodes } = require('./src/jobs/publishDailyCodes');

const start = async () => {
  await connectDB();
  startScheduler();

  // Publish today's codes on every boot — idempotent (findOrCreate), covers missed midnight crons
  publishDailyCodes().catch((err) =>
    logger.error('[STARTUP] Code publication failed:', err.message)
  );

  const server = app.listen(config.port, () => {
    logger.info(`equity-eyes API running on port ${config.port} [${config.env}]`);
    logger.info(`Base URL: http://localhost:${config.port}/api/${config.apiVersion}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
