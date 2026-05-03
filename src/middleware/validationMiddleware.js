const logger = require('../utils/logger');

/**
 * Request Validation Middleware
 * Validates request body/params/query against Joi schema
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {});

      logger.warn('Validation error', {
        source,
        path: req.path,
        details
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

/**
 * Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Log response when sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
  });

  next();
};

/**
 * Request Sanitization Middleware
 * Prevents NoSQL injection and XSS
 */
const sanitizeRequest = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove dangerous characters
      return value.replace(/[<>\"'`]/g, '');
    }

    if (typeof value === 'object' && value !== null) {
      return sanitizeObject(value);
    }

    return value;
  };

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeValue);
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeValue(obj[key]);
      }
    }

    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Pagination Middleware
 */
const pagination = (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    req.pagination = {
      limit,
      page,
      skip
    };

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pagination parameters',
      code: 'INVALID_PAGINATION'
    });
  }
};

/**
 * Sorting Middleware
 */
const sorting = (allowedFields = []) => {
  return (req, res, next) => {
    try {
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sort field',
          code: 'INVALID_SORT'
        });
      }

      req.sort = {
        [sortBy]: sortOrder
      };

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sorting parameters',
        code: 'INVALID_SORT'
      });
    }
  };
};

/**
 * Filter Middleware
 */
const filtering = (req, res, next) => {
  try {
    const filters = {};

    // Parse common filters
    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.minPrice && req.query.maxPrice) {
      filters.price = {
        $gte: parseFloat(req.query.minPrice),
        $lte: parseFloat(req.query.maxPrice)
      };
    }

    if (req.query.rating) {
      filters['ratings.averageRating'] = {
        $gte: parseFloat(req.query.rating)
      };
    }

    req.filters = filters;

    next();
  } catch (error) {
    logger.error('Filter parsing error', { error: error.message });
    req.filters = {};
    next();
  }
};

/**
 * Response Compression Setup
 * This is typically set in app.js with compression middleware
 */

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Health check middleware
 */
const healthCheck = (req, res, next) => {
  if (req.path === '/health') {
    return res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  next();
};

module.exports = {
  validateRequest,
  requestLogger,
  sanitizeRequest,
  pagination,
  sorting,
  filtering,
  corsOptions,
  healthCheck
};
