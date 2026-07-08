const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const rateLimiter = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Trust the first proxy (Nginx). Required for express-rate-limit to read
// the real client IP from X-Forwarded-For instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(requestLogger);
app.use(rateLimiter);

app.use(`/api/${config.apiVersion}`, routes);

// KYC uploads (admin review)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Admin dashboard (production build)
const adminDist = path.join(__dirname, '../admin/dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get(/^\/admin(\/.+)?$/, (req, res, next) => {
    res.sendFile(path.join(adminDist, 'index.html'), (err) => (err ? next() : undefined));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
