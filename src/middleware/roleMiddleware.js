const logger = require('../utils/logger');

/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s)
 */
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          role: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      logger.error('Role middleware error', { error: error.message });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
};

/**
 * Buyer Role Middleware
 */
const buyerOnly = roleMiddleware(['buyer', 'admin']);

/**
 * Seller Role Middleware
 */
const sellerOnly = roleMiddleware(['seller', 'admin']);

/**
 * Mechanic Role Middleware
 */
const mechanicOnly = roleMiddleware(['mechanic', 'admin']);

/**
 * Delivery Agent Role Middleware
 */
const deliveryAgentOnly = roleMiddleware(['delivery_agent', 'admin']);

/**
 * Admin Role Middleware
 */
const adminOnly = roleMiddleware(['admin']);

/**
 * Check ownership middleware
 * Verifies that user is the resource owner or admin
 */
const checkOwnership = (resourceOwnerId) => {
  return (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return next();
      }

      if (req.user.id !== resourceOwnerId.toString()) {
        logger.warn('Unauthorized resource access', {
          userId: req.user.id,
          resourceOwnerId,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
          code: 'NOT_OWNER'
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error', { error: error.message });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check seller ownership of product
 */
const checkProductOwnership = (req, res, next) => {
  try {
    const { productId } = req.params;

    if (req.user.role !== 'admin' && req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can manage products',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // This will be verified in the controller
    req.productId = productId;
    next();
  } catch (error) {
    logger.error('Product ownership check error', { error: error.message });

    return res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      code: 'AUTH_CHECK_ERROR'
    });
  }
};

/**
 * Check mechanic ownership of service
 */
const checkServiceOwnership = (req, res, next) => {
  try {
    const { serviceId } = req.params;

    if (req.user.role !== 'admin' && req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Only mechanics can manage services',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    req.serviceId = serviceId;
    next();
  } catch (error) {
    logger.error('Service ownership check error', { error: error.message });

    return res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      code: 'AUTH_CHECK_ERROR'
    });
  }
};

/**
 * Multiple roles middleware
 * Allows request if user has ANY of the specified roles
 */
const hasAnyRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error', { error: error.message });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
};

/**
 * All roles middleware
 * Allows all authenticated users
 */
const allRoles = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  next();
};

module.exports = {
  roleMiddleware,
  buyerOnly,
  sellerOnly,
  mechanicOnly,
  deliveryAgentOnly,
  adminOnly,
  checkOwnership,
  checkProductOwnership,
  checkServiceOwnership,
  hasAnyRole,
  allRoles
};
