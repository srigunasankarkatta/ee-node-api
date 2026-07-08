const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('./logger');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.pass, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: config.db.poolMax,
    min: config.db.poolMin,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    underscored: true,
    timestamps: true,
  },
  timezone: '+05:30', // IST
});

const connectDB = async () => {
  await sequelize.authenticate();
  logger.info(`MySQL connected → ${config.db.host}:${config.db.port}/${config.db.name}`);
};

module.exports = { sequelize, connectDB };
