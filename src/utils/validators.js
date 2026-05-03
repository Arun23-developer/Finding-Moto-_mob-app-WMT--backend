const Joi = require('joi');

/**
 * User Registration Validation
 */
const registerValidation = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/),
    password: Joi.string()
      .required()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      }),
    role: Joi.string().valid('buyer', 'seller', 'mechanic', 'delivery', 'admin').required(),
    businessName: Joi.string().when('role', {
      is: Joi.string().valid('seller', 'mechanic'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  return schema.validate(data);
};

/**
 * User Login Validation
 */
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

/**
 * Create Product Validation (Seller/Mechanic)
 */
const createProductValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().required().min(10).max(1000),
    price: Joi.number().required().positive(),
    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    quantity: Joi.number().required().positive().integer(),
    sku: Joi.string().required(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    specifications: Joi.object().optional(),
    warranty: Joi.object({
      duration: Joi.number(),
      type: Joi.string()
    }).optional()
  });

  return schema.validate(data);
};

/**
 * Create Service Validation (Mechanic only)
 */
const createServiceValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().required().min(10),
    basePrice: Joi.number().required().positive(),
    category: Joi.string().required(),
    estimatedDuration: Joi.number().required().positive(),
    warranty: Joi.object({
      duration: Joi.number(),
      type: Joi.string()
    }).optional()
  });

  return schema.validate(data);
};

/**
 * Place Order Validation
 */
const placeOrderValidation = (data) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().required().positive().integer()
        })
      )
      .required()
      .min(1),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    paymentMethod: Joi.string().valid('card', 'upi', 'wallet', 'cod').required()
  });

  return schema.validate(data);
};

/**
 * Create Review Validation
 */
const createReviewValidation = (data) => {
  const schema = Joi.object({
    targetId: Joi.string().required(),
    targetType: Joi.string().valid('product', 'service', 'seller', 'mechanic', 'delivery').required(),
    rating: Joi.number().required().integer().min(1).max(5),
    title: Joi.string().required().min(5).max(100),
    comment: Joi.string().required().min(10).max(1000),
    images: Joi.array().items(Joi.string().uri()).optional()
  });

  return schema.validate(data);
};

/**
 * Update Delivery Status Validation
 */
const updateDeliveryStatusValidation = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('assigned', 'in_transit', 'delivered', 'failed', 'cancelled')
      .required(),
    location: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    }).optional(),
    notes: Joi.string().optional(),
    photo: Joi.string().uri().optional()
  });

  return schema.validate(data);
};

/**
 * Generic Validation Error Handler
 */
const validationErrorResponse = (error) => {
  const messages = {};
  if (error.details) {
    error.details.forEach((detail) => {
      messages[detail.path.join('.')] = detail.message;
    });
  }
  return messages;
};

module.exports = {
  registerValidation,
  loginValidation,
  createProductValidation,
  createServiceValidation,
  placeOrderValidation,
  createReviewValidation,
  updateDeliveryStatusValidation,
  validationErrorResponse
};
