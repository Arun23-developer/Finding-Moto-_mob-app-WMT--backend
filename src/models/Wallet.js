const mongoose = require('mongoose');

/**
 * Wallet Schema
 * Handles user digital wallet for prepaid balance
 */
const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    
    // Account status
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed'],
      default: 'active'
    },
    
    // KYC verification
    kycVerified: {
      type: Boolean,
      default: false
    },
    
    // Transactions
    transactions: [
      {
        transactionId: String,
        type: {
          type: String,
          enum: ['credit', 'debit', 'refund', 'cashback', 'bonus'],
          required: true
        },
        amount: Number,
        reason: String, // e.g., 'order_payment', 'refund', 'cashback_earned'
        referenceId: mongoose.Schema.Types.ObjectId,
        timestamp: {
          type: Date,
          default: Date.now
        },
        balanceBefore: Number,
        balanceAfter: Number,
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed'],
          default: 'completed'
        }
      }
    ],
    
    // Recharge history
    rechargeHistory: [
      {
        rechargeId: String,
        amount: Number,
        paymentMethod: String,
        transactionId: String,
        rechargedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed'],
          default: 'completed'
        }
      }
    ],
    
    // Loyalty points
    loyaltyPoints: {
      type: Number,
      default: 0
    },
    
    pointsHistory: [
      {
        pointsEarned: Number,
        reason: String,
        earnedAt: Date,
        expiresAt: Date,
        redeemed: Boolean,
        redeemedAt: Date
      }
    ],
    
    // Cashback
    totalCashbackEarned: {
      type: Number,
      default: 0
    },
    
    totalCashbackRedeemed: {
      type: Number,
      default: 0
    },
    
    activeCashback: {
      type: Number,
      default: 0
    },
    
    cashbackHistory: [
      {
        cashbackId: String,
        amount: Number,
        reason: String,
        earnedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'credited', 'expired'],
          default: 'pending'
        },
        expiresAt: Date,
        referenceId: mongoose.Schema.Types.ObjectId
      }
    ],
    
    // Refunds
    pendingRefunds: [
      {
        refundId: String,
        amount: Number,
        reason: String,
        initiatedAt: Date,
        expectedCreditAt: Date,
        status: {
          type: String,
          enum: ['initiated', 'processing', 'credited'],
          default: 'initiated'
        }
      }
    ],
    
    // Restrictions
    restrictions: {
      dailySpendLimit: Number,
      monthlySpendLimit: Number,
      dailySpent: {
        type: Number,
        default: 0
      },
      monthlySpent: {
        type: Number,
        default: 0
      },
      lastSpendReset: Date,
      canTransferToBank: Boolean,
      canWithdraw: Boolean
    },
    
    // Account details
    accountCreatedAt: {
      type: Date,
      default: Date.now
    },
    
    lastTransactionAt: Date,
    lastRechargeAt: Date,
    
    // Account holder info
    accountHolderName: String,
    accountHolderEmail: String,
    accountHolderPhone: String,
    
    // Bank details for withdrawal
    bankAccount: {
      accountHolderName: String,
      accountNumber: String,
      accountType: {
        type: String,
        enum: ['savings', 'current']
      },
      ifscCode: String,
      bankName: String,
      verified: Boolean,
      verifiedAt: Date
    },
    
    // Tax identification
    taxId: String,
    
    // Settings
    autoRecharge: {
      enabled: Boolean,
      amount: Number,
      triggerBalance: Number
    },
    
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      }
    },
    
    // Fraud prevention
    suspectedFraud: {
      type: Boolean,
      default: false
    },
    
    fraudScore: Number,
    fraudCheckDate: Date
  },
  { timestamps: true }
);

/**
 * Add credit to wallet
 */
walletSchema.methods.addCredit = async function (amount, reason, referenceId = null) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (this.status !== 'active') {
    throw new Error('Wallet is not active');
  }

  const balanceBefore = this.balance;
  this.balance += amount;

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.transactions.push({
    transactionId,
    type: 'credit',
    amount,
    reason,
    referenceId,
    balanceBefore,
    balanceAfter: this.balance,
    status: 'completed'
  });

  this.lastTransactionAt = new Date();

  return this.save();
};

/**
 * Deduct from wallet
 */
walletSchema.methods.deductBalance = async function (amount, reason, referenceId = null) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (this.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  if (this.status !== 'active') {
    throw new Error('Wallet is not active');
  }

  // Check daily limit
  if (this.restrictions.dailySpendLimit) {
    if (this.restrictions.dailySpent + amount > this.restrictions.dailySpendLimit) {
      throw new Error('Daily spending limit exceeded');
    }
  }

  // Check monthly limit
  if (this.restrictions.monthlySpendLimit) {
    if (this.restrictions.monthlySpent + amount > this.restrictions.monthlySpendLimit) {
      throw new Error('Monthly spending limit exceeded');
    }
  }

  const balanceBefore = this.balance;
  this.balance -= amount;
  this.restrictions.dailySpent += amount;
  this.restrictions.monthlySpent += amount;

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.transactions.push({
    transactionId,
    type: 'debit',
    amount,
    reason,
    referenceId,
    balanceBefore,
    balanceAfter: this.balance,
    status: 'completed'
  });

  this.lastTransactionAt = new Date();

  return this.save();
};

/**
 * Add cashback
 */
walletSchema.methods.addCashback = async function (amount, reason, referenceId = null, expiryDays = 90) {
  const cashbackId = `CB-${Date.now()}`;

  this.cashbackHistory.push({
    cashbackId,
    amount,
    reason,
    earnedAt: new Date(),
    expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    status: 'pending',
    referenceId
  });

  this.activeCashback += amount;
  this.totalCashbackEarned += amount;

  return this.save();
};

/**
 * Redeem cashback
 */
walletSchema.methods.redeemCashback = async function (amount) {
  if (this.activeCashback < amount) {
    throw new Error('Insufficient cashback available');
  }

  this.activeCashback -= amount;
  this.totalCashbackRedeemed += amount;

  // Add to wallet balance
  return this.addCredit(amount, 'Cashback redemption');
};

/**
 * Add loyalty points
 */
walletSchema.methods.addLoyaltyPoints = async function (points, reason, expiryDays = 365) {
  this.loyaltyPoints += points;

  this.pointsHistory.push({
    pointsEarned: points,
    reason,
    earnedAt: new Date(),
    expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    redeemed: false
  });

  return this.save();
};

/**
 * Redeem loyalty points to cashback
 */
walletSchema.methods.redeemLoyaltyPoints = async function (points, conversionRate = 0.1) {
  if (this.loyaltyPoints < points) {
    throw new Error('Insufficient loyalty points');
  }

  this.loyaltyPoints -= points;

  // Mark points as redeemed
  let remaining = points;
  for (const point of this.pointsHistory) {
    if (!point.redeemed && remaining > 0) {
      const redeem = Math.min(remaining, point.pointsEarned);
      point.redeemed = true;
      point.redeemedAt = new Date();
      remaining -= redeem;
    }
  }

  const cashbackAmount = points * conversionRate;
  return this.addCredit(cashbackAmount, `Loyalty points redemption (${points} points)`);
};

/**
 * Initiate refund to wallet
 */
walletSchema.methods.initiateRefund = async function (amount, reason, referenceId = null) {
  const refundId = `REF-${Date.now()}`;

  this.pendingRefunds.push({
    refundId,
    amount,
    reason,
    initiatedAt: new Date(),
    expectedCreditAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'initiated'
  });

  return this.save();
};

/**
 * Complete refund
 */
walletSchema.methods.completeRefund = async function (refundId) {
  const refund = this.pendingRefunds.find((r) => r.refundId === refundId);

  if (!refund) {
    throw new Error('Refund not found');
  }

  refund.status = 'credited';

  return this.addCredit(refund.amount, `Refund - ${refund.reason}`, refundId);
};

/**
 * Suspend wallet
 */
walletSchema.methods.suspendWallet = async function (reason) {
  this.status = 'suspended';
  this.suspectedFraud = true;

  return this.save();
};

/**
 * Get transaction history
 */
walletSchema.methods.getTransactionHistory = function (limit = 20) {
  return this.transactions.slice(-limit).reverse();
};

module.exports = mongoose.model('Wallet', walletSchema);
