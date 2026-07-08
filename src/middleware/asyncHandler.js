'use strict';

// Wraps async Express handlers so thrown errors reach the errorHandler middleware
// instead of becoming unhandledRejections that crash the process.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
