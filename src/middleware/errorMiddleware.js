const logger = require('../utils/logger');

/**
 * Global Error Handling Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  try {
    // Set default status and message
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let code = err.code || 'INTERNAL_ERROR';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      status = 400;
      message = Object.values(err.errors)
        .map((error) => error.message)
        .join(', ');
      code = 'VALIDATION_ERROR';
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
      status = 409;
      const field = Object.keys(err.keyPattern)[0];
      message = `${field} already exists`;
      code = 'DUPLICATE_ENTRY';
    }

    // Mongoose cast error
    if (err.name === 'CastError') {
      status = 400;
      message = `Invalid ${err.path}: ${err.value}`;
      code = 'INVALID_ID';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      status = 401;
      message = 'Invalid token';
      code = 'INVALID_TOKEN';
    }

    if (err.name === 'TokenExpiredError') {
      status = 401;
      message = 'Token expired';
      code = 'TOKEN_EXPIRED';
    }

    // Joi validation error
    if (err.isJoi) {
      status = 400;
      message = err.details.map((detail) => detail.message).join(', ');
      code = 'VALIDATION_ERROR';
    }

    // Log error
    logger.error('Request error', {
      status,
      message,
      code,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Send response
    res.status(status).json({
      success: false,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  } catch (error) {
    logger.error('Error in error middleware', { error: error.message });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * 404 Not Found Middleware
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Not Found - ${req.method} ${req.path}`);
  res.status(404);
  next(error);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Validation error class
 */
class ValidationError extends ApiError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Not found error class
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Unauthorized error class
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error class
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Duplicate error class
 */
class DuplicateError extends ApiError {
  constructor(field = 'Entry', message = null) {
    super(message || `${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }
}

/**
 * Bad request error class
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Rate limit error class
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
  asyncHandler,
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  DuplicateError,
  BadRequestError,
  RateLimitError
};
