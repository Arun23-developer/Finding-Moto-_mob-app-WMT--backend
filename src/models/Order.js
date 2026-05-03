const mongoose = require('mongoose');

/**
 * Order Schema
 * Represents both spare part orders
 */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SparePart',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        unitPrice: Number,
        totalPrice: Number
      }
    ],
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      latitude: Number,
      longitude: Number,
      contactName: String,
      phone: String
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    pricing: {
      subtotal: Number,
      tax: Number,
      shippingCost: Number,
      discount: Number,
      promoCode: String,
      totalAmount: {
        type: Number,
        required: true
      }
    },
    payment: {
      method: {
        type: String,
        enum: ['card', 'upi', 'wallet', 'cod', 'netbanking'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      transactionId: String,
      gatewayResponse: mongoose.Schema.Types.Mixed,
      paymentDate: Date,
      refund: {
        status: {
          type: String,
          enum: ['none', 'pending', 'completed'],
          default: 'none'
        },
        amount: Number,
        reason: String,
        refundDate: Date,
        refundTransactionId: String
      }
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'ready_for_pickup',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled',
        'failed'
      ],
      default: 'pending',
      index: true
    },
    statusTimeline: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        notes: String,
        updatedBy: String
      }
    ],
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery'
    },
    deliveryAgent: {
      agentId: mongoose.Schema.Types.ObjectId,
      agentName: String,
      agentPhone: String,
      agentRating: Number
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    
    // Return management
    isReturnable: {
      type: Boolean,
      default: true
    },
    returnDeadline: Date,
    returnRequest: {
      initiated: Boolean,
      initiatedAt: Date,
      reason: String,
      status: {
        type: String,
        enum: ['none', 'initiated', 'approved', 'rejected', 'returned', 'refunded'],
        default: 'none'
      },
      approvedAt: Date,
      returnedAt: Date
    },
    
    // Rating & Review
    rating: {
      productRating: {
        type: Number,
        min: 1,
        max: 5
      },
      sellerRating: {
        type: Number,
        min: 1,
        max: 5
      },
      deliveryRating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      ratedAt: Date,
      images: [String]
    },
    
    // Tracking
    trackingNumber: String,
    trackingStatus: {
      lastUpdate: Date,
      currentLocation: {
        latitude: Number,
        longitude: Number
      },
      estimatedArrival: Date
    },
    
    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ['buyer', 'seller', 'system']
    },
    
    // Notes
    notes: String,
    internalNotes: String,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  },
  { timestamps: true }
);

/**
 * Generate order number
 */
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
  next();
});

/**
 * Update order status
 */
orderSchema.methods.updateStatus = async function (newStatus, notes = '', updatedBy = 'system') {
  this.status = newStatus;
  this.statusTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
    updatedBy
  });

  if (newStatus === 'delivered') {
    this.actualDeliveryDate = new Date();
  }

  return this.save();
};

/**
 * Calculate total amount
 */
orderSchema.methods.calculateTotal = function () {
  return (
    this.pricing.subtotal +
    this.pricing.tax +
    this.pricing.shippingCost -
    (this.pricing.discount || 0)
  );
};

/**
 * Check if returnable
 */
orderSchema.methods.isReturnEligible = function () {
  if (!this.isReturnable || this.status !== 'delivered') {
    return false;
  }

  const daysSinceDelivery = Math.floor(
    (new Date() - new Date(this.actualDeliveryDate)) / (1000 * 60 * 60 * 24)
  );

  return daysSinceDelivery <= 7; // 7 days return window
};

/**
 * Initiate return
 */
orderSchema.methods.initiateReturn = async function (reason) {
  if (!this.isReturnEligible()) {
    throw new Error('This order is not eligible for return');
  }

  this.returnRequest.initiated = true;
  this.returnRequest.initiatedAt = new Date();
  this.returnRequest.reason = reason;
  this.returnRequest.status = 'initiated';

  return this.save();
};

/**
 * Approve return
 */
orderSchema.methods.approveReturn = async function () {
  this.returnRequest.status = 'approved';
  this.returnRequest.approvedAt = new Date();
  return this.save();
};

/**
 * Complete return
 */
orderSchema.methods.completeReturn = async function () {
  this.returnRequest.status = 'returned';
  this.returnRequest.returnedAt = new Date();
  this.payment.refund.status = 'completed';
  this.payment.refund.refundDate = new Date();
  this.status = 'refunded';

  return this.save();
};

/**
 * Add rating
 */
orderSchema.methods.addRating = async function (productRating, sellerRating, deliveryRating, review, images = []) {
  this.rating = {
    productRating,
    sellerRating,
    deliveryRating,
    review,
    images,
    ratedAt: new Date()
  };

  return this.save();
};

/**
 * Cancel order
 */
orderSchema.methods.cancelOrder = async function (reason, cancelledBy = 'buyer') {
  if (['delivered', 'cancelled', 'refunded'].includes(this.status)) {
    throw new Error('Cannot cancel this order');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;

  // Refund payment if already completed
  if (this.payment.status === 'completed') {
    this.payment.refund.status = 'pending';
    this.payment.refund.reason = reason;
  }

  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
