const mongoose = require('mongoose');

/**
 * PromoCode Schema
 * Manages promotional codes, discounts, and offers
 */
const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    
    description: String,
    
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true
    },
    
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    
    // For percentage discounts
    maxDiscountAmount: Number,
    
    // For flat discounts
    minPurchaseAmount: {
      type: Number,
      default: 0
    },
    
    // For both
    maxUses: Number,
    maxUsesPerUser: {
      type: Number,
      default: 1
    },
    
    currentUses: {
      type: Number,
      default: 0
    },
    
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    
    // Validity
    validFrom: {
      type: Date,
      default: Date.now
    },
    
    validTill: {
      type: Date,
      required: true
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Applicability
    applicableOn: {
      type: String,
      enum: ['all', 'specific_products', 'specific_categories', 'specific_sellers', 'first_order'],
      default: 'all'
    },
    
    applicableProducts: [mongoose.Schema.Types.ObjectId],
    applicableCategories: [String],
    applicableSellers: [mongoose.Schema.Types.ObjectId],
    
    // Conditions
    minOrderValue: {
      type: Number,
      default: 0
    },
    
    maxOrderValue: Number,
    
    applicableRoles: {
      type: [String],
      enum: ['buyer', 'seller', 'mechanic', 'delivery_agent', 'all'],
      default: ['all']
    },
    
    // User segments
    targetedUsers: {
      byRole: [String],
      byLocation: [String],
      byRegistrationDate: {
        from: Date,
        to: Date
      },
      bySpendingAmount: {
        min: Number,
        max: Number
      }
    },
    
    // Exclusions
    excludedProducts: [mongoose.Schema.Types.ObjectId],
    excludedCategories: [String],
    excludedSellers: [mongoose.Schema.Types.ObjectId],
    excludedUsers: [mongoose.Schema.Types.ObjectId],
    
    // Rules
    canCombineWithOtherPromos: {
      type: Boolean,
      default: false
    },
    
    canCombineWithCashback: {
      type: Boolean,
      default: false
    },
    
    maxItemsApplicable: Number,
    
    applicableToDeliveryFee: {
      type: Boolean,
      default: false
    },
    
    // Marketing
    campaignName: String,
    campaignId: mongoose.Schema.Types.ObjectId,
    source: {
      type: String,
      enum: ['email', 'sms', 'push', 'social', 'referral', 'admin', 'affiliate', 'event', 'other'],
      default: 'admin'
    },
    
    // Usage tracking
    usageDetails: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        orderId: mongoose.Schema.Types.ObjectId,
        discountApplied: Number,
        usedAt: Date,
        orderAmount: Number,
        status: {
          type: String,
          enum: ['completed', 'cancelled', 'refunded'],
          default: 'completed'
        }
      }
    ],
    
    totalDiscountGiven: {
      type: Number,
      default: 0
    },
    
    // User who can use
    usableBy: {
      type: String,
      enum: ['all', 'specific_users', 'new_users', 'returning_users'],
      default: 'all'
    },
    
    specificUsers: [mongoose.Schema.Types.ObjectId],
    
    // Device/Platform
    applicableOnMobile: {
      type: Boolean,
      default: true
    },
    
    applicableOnWeb: {
      type: Boolean,
      default: true
    },
    
    applicableOnApp: {
      type: Boolean,
      default: true
    },
    
    // Payment methods
    applicablePaymentMethods: [
      {
        type: String,
        enum: ['card', 'upi', 'wallet', 'cod', 'netbanking', 'all']
      }
    ],
    
    // Geolocation
    applicableCities: [String],
    applicableStates: [String],
    applicableCountries: {
      type: [String],
      default: ['IN']
    },
    
    // Special conditions
    requiresEmailVerification: {
      type: Boolean,
      default: false
    },
    
    requiresPhoneVerification: {
      type: Boolean,
      default: false
    },
    
    requiresKYC: {
      type: Boolean,
      default: false
    },
    
    // Terms
    termsAndConditions: String,
    disclaimer: String,
    
    // Admin info
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
    
    notes: String,
    
    // Visibility
    visibility: {
      type: String,
      enum: ['public', 'hidden', 'admin_only'],
      default: 'public'
    },
    
    // Analytics
    impressions: {
      type: Number,
      default: 0
    },
    
    clicks: {
      type: Number,
      default: 0
    },
    
    conversions: {
      type: Number,
      default: 0
    },
    
    revenue: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

/**
 * Check if promo code is valid
 */
promoCodeSchema.methods.isValid = function (orderAmount = 0, userId = null, category = null) {
  const now = new Date();

  // Check active status
  if (!this.isActive) {
    return { valid: false, reason: 'Promo code is inactive' };
  }

  // Check expiry
  if (now < this.validFrom || now > this.validTill) {
    return { valid: false, reason: 'Promo code has expired' };
  }

  // Check max uses
  if (this.maxUses && this.currentUses >= this.maxUses) {
    return { valid: false, reason: 'Promo code usage limit reached' };
  }

  // Check minimum order value
  if (orderAmount < this.minOrderValue) {
    return {
      valid: false,
      reason: `Minimum order value of ${this.currency} ${this.minOrderValue} required`
    };
  }

  // Check maximum order value
  if (this.maxOrderValue && orderAmount > this.maxOrderValue) {
    return { valid: false, reason: 'Order amount exceeds maximum limit' };
  }

  // Check applicability
  if (this.applicableOn === 'specific_products' && !category) {
    return { valid: false, reason: 'Promo code not applicable' };
  }

  // Check exclusions
  if (this.excludedUsers && this.excludedUsers.includes(userId)) {
    return { valid: false, reason: 'You are not eligible for this promo code' };
  }

  return { valid: true };
};

/**
 * Calculate discount
 */
promoCodeSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;

    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else if (this.discountType === 'flat') {
    discount = this.discountValue;
  }

  return Math.min(discount, orderAmount);
};

/**
 * Apply promo code
 */
promoCodeSchema.methods.apply = async function (userId, orderId, orderAmount, status = 'completed') {
  this.usageDetails.push({
    userId,
    orderId,
    discountApplied: this.calculateDiscount(orderAmount),
    usedAt: new Date(),
    orderAmount,
    status
  });

  this.currentUses += 1;
  this.totalDiscountGiven += this.calculateDiscount(orderAmount);

  if (status === 'completed') {
    this.conversions += 1;
    this.revenue += orderAmount;
  }

  return this.save();
};

/**
 * Get usage by user
 */
promoCodeSchema.methods.getUserUsageCount = function (userId) {
  return this.usageDetails.filter((u) => u.userId.toString() === userId.toString()).length;
};

/**
 * Check if user can use
 */
promoCodeSchema.methods.canUserUse = function (userId) {
  if (this.usableBy === 'all') {
    return true;
  }

  if (this.usableBy === 'specific_users') {
    return this.specificUsers.some((id) => id.toString() === userId.toString());
  }

  return false;
};

/**
 * Deactivate promo code
 */
promoCodeSchema.methods.deactivate = async function (reason) {
  this.isActive = false;
  this.notes = (this.notes || '') + `\nDeactivated: ${reason}`;
  return this.save();
};

/**
 * Get usage stats
 */
promoCodeSchema.methods.getStats = function () {
  const completedUsage = this.usageDetails.filter((u) => u.status === 'completed');
  const cancelledUsage = this.usageDetails.filter((u) => u.status === 'cancelled');

  return {
    totalUses: this.currentUses,
    completedUses: completedUsage.length,
    cancelledUses: cancelledUsage.length,
    totalDiscountGiven: this.totalDiscountGiven,
    averageDiscountPerUse: completedUsage.length > 0 ? this.totalDiscountGiven / completedUsage.length : 0,
    conversionRate: this.impressions > 0 ? (this.conversions / this.impressions) * 100 : 0,
    impressions: this.impressions,
    clicks: this.clicks,
    conversions: this.conversions,
    revenue: this.revenue,
    utilizationRate: this.maxUses ? (this.currentUses / this.maxUses) * 100 : 100
  };
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);
