const mongoose = require('mongoose');

/**
 * Delivery Schema
 * Handles delivery tracking and return logistics
 */
const deliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    deliveryNumber: {
      type: String,
      unique: true,
      required: true
    },
    type: {
      type: String,
      enum: ['delivery', 'return'],
      default: 'delivery'
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assignedAt: Date,
    assignmentAlgorithm: String, // e.g., 'nearest_available'
    
    pickupLocation: {
      locationType: {
        type: String,
        enum: ['seller_warehouse', 'warehouse', 'custom'],
        default: 'seller_warehouse'
      },
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      latitude: Number,
      longitude: Number,
      contactName: String,
      phone: String,
      specialInstructions: String
    },
    
    dropoffLocation: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      latitude: Number,
      longitude: Number,
      contactName: String,
      phone: String,
      specialInstructions: String
    },
    
    estimatedPickupTime: Date,
    actualPickupTime: Date,
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    
    status: {
      type: String,
      enum: [
        'assigned',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled',
        'reattempt'
      ],
      default: 'assigned',
      index: true
    },
    
    statusUpdates: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        location: {
          latitude: Number,
          longitude: Number
        },
        notes: String,
        updatedBy: String,
        agentId: mongoose.Schema.Types.ObjectId
      }
    ],
    
    currentLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      accuracy: Number
    },
    
    trackingHistory: [
      {
        latitude: Number,
        longitude: Number,
        timestamp: Date
      }
    ],
    
    deliveryConfirmation: {
      confirmedAt: Date,
      otp: {
        code: String,
        generatedAt: Date,
        expiresAt: Date,
        attempts: {
          type: Number,
          default: 0
        }
      },
      signature: String, // URL to signature image
      photo: String, // URL to delivery photo
      recipientName: String,
      notes: String
    },
    
    issues: [
      {
        type: {
          type: String,
          enum: [
            'customer_not_available',
            'address_not_found',
            'customer_refused',
            'package_damaged',
            'package_lost',
            'vehicle_breakdown',
            'accident',
            'other'
          ]
        },
        reportedAt: {
          type: Date,
          default: Date.now
        },
        description: String,
        photos: [String],
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium'
        },
        resolution: String,
        resolvedAt: Date,
        resolvedBy: mongoose.Schema.Types.ObjectId
      }
    ],
    
    ratings: {
      agentRating: {
        type: Number,
        min: 1,
        max: 5
      },
      agentReview: String,
      ratedAt: Date
    },
    
    costs: {
      baseCharge: Number,
      distanceCharge: Number,
      additionalCharge: Number,
      totalCharge: Number,
      currency: {
        type: String,
        default: 'INR'
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      }
    },
    
    // For returns
    returnDetails: {
      reason: String,
      condition: {
        type: String,
        enum: ['good', 'damaged', 'open', 'defective']
      },
      inspectionNotes: String,
      refundEligible: Boolean,
      inspectedBy: mongoose.Schema.Types.ObjectId,
      inspectedAt: Date
    },
    
    // Attempt tracking
    attemptNumber: {
      type: Number,
      default: 1
    },
    previousAttempts: [
      {
        attemptNumber: Number,
        reason: String,
        attemptedAt: Date
      }
    ],
    maxAttempts: {
      type: Number,
      default: 3
    },
    
    // Route optimization
    optimizationData: {
      distance: Number, // in km
      estimatedDuration: Number, // in minutes
      traffic: String, // heavy, moderate, light
      weather: String,
      route: mongoose.Schema.Types.Mixed
    },
    
    notificationsSent: {
      pickupNotification: Boolean,
      inTransitNotification: Boolean,
      outForDeliveryNotification: Boolean,
      deliveryNotification: Boolean
    },
    
    cancelledAt: Date,
    cancellationReason: String,
    
    agentNotes: String
  },
  { timestamps: true }
);

/**
 * Generate delivery number
 */
deliverySchema.pre('save', async function (next) {
  if (!this.deliveryNumber) {
    const count = await this.constructor.countDocuments();
    this.deliveryNumber = `DEL-${Date.now()}-${count + 1}`;
  }
  next();
});

/**
 * Update delivery status with tracking
 */
deliverySchema.methods.updateStatus = async function (newStatus, location = null, notes = '', agentId = null) {
  this.status = newStatus;

  this.statusUpdates.push({
    status: newStatus,
    timestamp: new Date(),
    location,
    notes,
    agentId
  });

  if (location) {
    this.currentLocation = {
      ...location,
      timestamp: new Date()
    };

    this.trackingHistory.push({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date()
    });
  }

  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  } else if (newStatus === 'picked_up') {
    this.actualPickupTime = new Date();
  }

  return this.save();
};

/**
 * Generate OTP for delivery confirmation
 */
deliverySchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.deliveryConfirmation.otp = {
    code: otp,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  };
  return otp;
};

/**
 * Verify OTP
 */
deliverySchema.methods.verifyOTP = function (enteredOTP) {
  const otpData = this.deliveryConfirmation.otp;

  if (!otpData || new Date() > otpData.expiresAt) {
    return { valid: false, message: 'OTP expired' };
  }

  if (otpData.attempts >= 3) {
    return { valid: false, message: 'Maximum attempts exceeded' };
  }

  if (enteredOTP !== otpData.code) {
    otpData.attempts += 1;
    return { valid: false, message: `Incorrect OTP. ${3 - otpData.attempts} attempts remaining` };
  }

  return { valid: true };
};

/**
 * Confirm delivery
 */
deliverySchema.methods.confirmDelivery = async function (recipientName, signature, photo, notes = '') {
  this.deliveryConfirmation = {
    confirmedAt: new Date(),
    signature,
    photo,
    recipientName,
    notes,
    otp: {}
  };

  this.status = 'delivered';
  this.actualDeliveryTime = new Date();

  return this.save();
};

/**
 * Report issue
 */
deliverySchema.methods.reportIssue = async function (issueType, description, photos = [], severity = 'medium') {
  this.issues.push({
    type: issueType,
    description,
    photos,
    severity,
    reportedAt: new Date()
  });

  if (severity === 'high') {
    this.status = 'failed';
  }

  return this.save();
};

/**
 * Retry delivery
 */
deliverySchema.methods.retryDelivery = async function (reason) {
  this.previousAttempts.push({
    attemptNumber: this.attemptNumber,
    reason,
    attemptedAt: new Date()
  });

  this.attemptNumber += 1;

  if (this.attemptNumber > this.maxAttempts) {
    this.status = 'failed';
    throw new Error('Maximum delivery attempts exceeded');
  }

  this.status = 'reattempt';
  this.estimatedDeliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day

  return this.save();
};

/**
 * Rate delivery agent
 */
deliverySchema.methods.rateAgent = async function (rating, review = '') {
  this.ratings = {
    agentRating: rating,
    agentReview: review,
    ratedAt: new Date()
  };

  return this.save();
};

/**
 * Calculate delivery time
 */
deliverySchema.methods.getDeliveryTime = function () {
  if (this.actualDeliveryTime && this.actualPickupTime) {
    return Math.floor((this.actualDeliveryTime - this.actualPickupTime) / (1000 * 60)); // minutes
  }
  return null;
};

module.exports = mongoose.model('Delivery', deliverySchema);
