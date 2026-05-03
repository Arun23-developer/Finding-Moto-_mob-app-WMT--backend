const mongoose = require('mongoose');

/**
 * Payment Schema
 * Tracks all payment transactions
 */
const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    paymentType: {
      type: String,
      enum: ['order', 'service_booking', 'wallet_recharge', 'subscription'],
      required: true,
      index: true
    },
    
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    
    // Amount
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    
    // Payment method
    paymentMethod: {
      type: {
        type: String,
        enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'cod'],
        required: true
      },
      cardDetails: {
        cardNumber: String, // masked
        cardHolderName: String,
        expiryMonth: String,
        expiryYear: String,
        cardBrand: String,
        last4Digits: String,
        issuerBank: String
      },
      upiDetails: {
        upiId: String,
        vpa: String
      },
      walletDetails: {
        walletProvider: String,
        walletId: String,
        email: String
      }
    },
    
    // Payment gateway
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', 'cod_system'],
      required: true
    },
    
    gatewayTransactionId: String,
    gatewayOrderId: String,
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'authorized', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },
    
    statusHistory: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        message: String,
        gatewayResponse: mongoose.Schema.Types.Mixed
      }
    ],
    
    // Authorization
    authorizationCode: String,
    authorizationAmount: Number,
    
    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    
    authorizedAt: Date,
    completedAt: Date,
    failedAt: Date,
    
    // Failure details
    failureReason: String,
    failureCode: String,
    failureDescription: String,
    retryCount: {
      type: Number,
      default: 0
    },
    retryable: Boolean,
    nextRetryAt: Date,
    
    // Gateway response
    gatewayResponse: mongoose.Schema.Types.Mixed,
    
    // Refund
    refund: {
      status: {
        type: String,
        enum: ['none', 'pending', 'partial', 'completed'],
        default: 'none'
      },
      amount: Number,
      reason: String,
      initiatedAt: Date,
      completedAt: Date,
      gatewayRefundId: String,
      refundTransactionId: String
    },
    
    // Customer details
    customerDetails: {
      name: String,
      email: String,
      phone: String,
      address: String
    },
    
    // Billing details
    billingDetails: {
      name: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    
    // 3D Secure
    threeDSecure: {
      enabled: Boolean,
      version: String,
      status: String,
      redirectUrl: String
    },
    
    // Fraud detection
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    
    riskScore: Number,
    
    fraudCheckResult: {
      passed: Boolean,
      checks: [String],
      checkedAt: Date
    },
    
    // Dispute
    hasDispute: {
      type: Boolean,
      default: false
    },
    
    disputeDetails: {
      disputeId: String,
      reason: String,
      amount: Number,
      initiatedAt: Date,
      status: {
        type: String,
        enum: ['open', 'under_review', 'won', 'lost']
      },
      evidenceDeadline: Date
    },
    
    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false
    },
    
    reconciledAt: Date,
    
    // Receipt
    receiptNumber: String,
    invoiceNumber: String,
    receiptUrl: String,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    
    // Notes
    notes: String,
    internalNotes: String
  },
  { timestamps: true }
);

/**
 * Index for transaction lookups
 */
paymentSchema.index({ gatewayTransactionId: 1 });
paymentSchema.index({ referenceId: 1, paymentType: 1 });
paymentSchema.index({ createdAt: -1 });

/**
 * Update payment status
 */
paymentSchema.methods.updateStatus = async function (newStatus, message = '', gatewayResponse = null) {
  this.status = newStatus;

  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    message,
    gatewayResponse
  });

  if (newStatus === 'authorized') {
    this.authorizedAt = new Date();
  } else if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'failed') {
    this.failedAt = new Date();
  }

  return this.save();
};

/**
 * Mark as completed with authorization
 */
paymentSchema.methods.markCompleted = async function (authCode, amount) {
  this.status = 'completed';
  this.authorizationCode = authCode;
  this.authorizationAmount = amount;
  this.completedAt = new Date();

  this.statusHistory.push({
    status: 'completed',
    timestamp: new Date(),
    message: 'Payment successfully completed'
  });

  return this.save();
};

/**
 * Mark as failed
 */
paymentSchema.methods.markFailed = async function (reason, code, description) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failureCode = code;
  this.failureDescription = description;
  this.failedAt = new Date();

  this.statusHistory.push({
    status: 'failed',
    timestamp: new Date(),
    message: description
  });

  return this.save();
};

/**
 * Schedule retry
 */
paymentSchema.methods.scheduleRetry = async function (minutesFromNow = 15) {
  if (this.retryCount >= 3) {
    return; // Max retries reached
  }

  this.retryCount += 1;
  this.nextRetryAt = new Date(Date.now() + minutesFromNow * 60 * 1000);

  return this.save();
};

/**
 * Process refund
 */
paymentSchema.methods.processRefund = async function (amount, reason) {
  if (this.status !== 'completed') {
    throw new Error('Cannot refund non-completed payments');
  }

  this.refund = {
    status: 'pending',
    amount: amount || this.amount,
    reason,
    initiatedAt: new Date()
  };

  this.statusHistory.push({
    status: 'refund_initiated',
    timestamp: new Date(),
    message: `Refund of ${this.refund.amount} initiated - ${reason}`
  });

  return this.save();
};

/**
 * Complete refund
 */
paymentSchema.methods.completeRefund = async function (refundId) {
  if (!this.refund || this.refund.status === 'none') {
    throw new Error('No refund pending');
  }

  this.refund.status = 'completed';
  this.refund.completedAt = new Date();
  this.refund.gatewayRefundId = refundId;
  this.status = 'refunded';

  this.statusHistory.push({
    status: 'refunded',
    timestamp: new Date(),
    message: `Refund completed - ${refundId}`
  });

  return this.save();
};

/**
 * Check if retriable
 */
paymentSchema.methods.isRetriable = function () {
  return this.status === 'failed' && this.retryCount < 3 && this.retryable === true;
};

/**
 * Get display status
 */
paymentSchema.methods.getDisplayStatus = function () {
  const statusMap = {
    pending: 'Processing',
    authorized: 'Authorized',
    completed: 'Successful',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  };

  return statusMap[this.status] || this.status;
};

/**
 * Mask card number
 */
paymentSchema.methods.maskCardNumber = function () {
  if (this.paymentMethod.type !== 'credit_card' && this.paymentMethod.type !== 'debit_card') {
    return null;
  }

  return `****-****-****-${this.paymentMethod.cardDetails.last4Digits}`;
};

module.exports = mongoose.model('Payment', paymentSchema);
