const logger = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/** 404 handler — put this after all routes. */
function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Final error handler — put this last of all, after notFound. */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  } else {
    logger.warn(err.message, { path: req.originalUrl, method: req.method });
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Something went wrong on our end. Please try again." : err.message,
  });
}

module.exports = { AppError, notFound, errorHandler };
