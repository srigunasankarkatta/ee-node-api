const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;
  }
}

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    logger.error(err);
  } else {
    logger.warn(`${statusCode} - ${err.message} - ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: err.message || 'Internal Server Error',
    ...(err.data != null ? { data: err.data } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = { AppError, notFound, errorHandler };
