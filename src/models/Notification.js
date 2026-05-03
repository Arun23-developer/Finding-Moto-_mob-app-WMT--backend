const mongoose = require('mongoose');

/**
 * Notification Schema
 * Handles all push notifications, email, and SMS alerts
 */
const notificationSchema = new mongoose.Schema(
  {
    notificationNumber: {
      type: String,
      unique: true,
      required: true
    },
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    type: {
      type: String,
      enum: [
        'order_confirmation',
        'order_shipped',
        'order_delivered',
        'order_cancelled',
        'return_initiated',
        'return_approved',
        'payment_received',
        'payment_failed',
        'booking_confirmed',
        'booking_cancelled',
        'booking_reminder',
        'service_completed',
        'review_request',
        'rating_reminder',
        'message_received',
        'dispute_update',
        'seller_alert',
        'mechanic_alert',
        'delivery_alert',
        'promotion',
        'wallet_update',
        'loyalty_points',
        'cashback_earned',
        'account_update',
        'security_alert',
        'verification_required',
        'general'
      ],
      required: true,
      index: true
    },
    
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    category: {
      type: String,
      enum: ['order', 'booking', 'payment', 'account', 'promotion', 'security', 'system'],
      index: true
    },
    
    // Content
    title: {
      type: String,
      required: true
    },
    
    message: {
      type: String,
      required: true
    },
    
    description: String,
    imageUrl: String,
    
    // Action
    actionUrl: String,
    actionData: mongoose.Schema.Types.Mixed,
    deepLink: String,
    
    // Reference
    referenceType: {
      type: String,
      enum: ['order', 'booking', 'payment', 'delivery', 'user', 'service'],
      index: true
    },
    
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    
    relatedIds: [mongoose.Schema.Types.ObjectId],
    
    // Delivery channels
    channels: {
      push: {
        sent: Boolean,
        sentAt: Date,
        failureReason: String,
        deliveryToken: String
      },
      email: {
        sent: Boolean,
        sentAt: Date,
        failureReason: String,
        recipientEmail: String,
        templateId: String
      },
      sms: {
        sent: Boolean,
        sentAt: Date,
        failureReason: String,
        recipientPhone: String,
        messageId: String
      },
      inApp: {
        shown: Boolean,
        shownAt: Date,
        read: Boolean,
        readAt: Date
      }
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'failed', 'read', 'archived'],
      default: 'sent',
      index: true
    },
    
    // Delivery status
    deliveryStatus: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    },
    
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    
    maxDeliveryAttempts: {
      type: Number,
      default: 3
    },
    
    nextRetryAt: Date,
    
    // Read status
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    
    readAt: Date,
    
    // Archive/Delete
    archived: {
      type: Boolean,
      default: false
    },
    
    archivedAt: Date,
    deleted: {
      type: Boolean,
      default: false
    },
    
    deletedAt: Date,
    
    // Scheduling
    scheduledFor: Date,
    sendAt: {
      type: Date,
      default: Date.now
    },
    
    // Personalization
    personalization: {
      firstName: String,
      lastName: String,
      username: String,
      customData: mongoose.Schema.Types.Mixed
    },
    
    // Batch/Campaign
    campaignId: String,
    batchId: String,
    
    // Template
    templateId: String,
    templateName: String,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    
    // A/B Testing
    variantId: String,
    
    // Analytics
    clicks: {
      type: Number,
      default: 0
    },
    
    conversions: {
      type: Number,
      default: 0
    },
    
    // Feedback
    feedback: {
      liked: Boolean,
      helpful: Boolean,
      spam: Boolean,
      reason: String
    },
    
    // Unsubscribe
    unsubscribeToken: String,
    
    // Expiry
    expiresAt: Date
  },
  { timestamps: true }
);

/**
 * Generate notification number
 */
notificationSchema.pre('save', async function (next) {
  if (!this.notificationNumber) {
    const count = await this.constructor.countDocuments();
    this.notificationNumber = `NOTIF-${Date.now()}-${count + 1}`;
  }
  next();
});

/**
 * Mark as read
 */
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.readAt = new Date();
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  this.status = 'read';
  return this.save();
};

/**
 * Mark as unread
 */
notificationSchema.methods.markAsUnread = async function () {
  this.read = false;
  this.readAt = null;
  this.channels.inApp.read = false;
  this.channels.inApp.readAt = null;
  return this.save();
};

/**
 * Archive notification
 */
notificationSchema.methods.archive = async function () {
  this.archived = true;
  this.archivedAt = new Date();
  this.status = 'archived';
  return this.save();
};

/**
 * Delete notification (soft delete)
 */
notificationSchema.methods.delete = async function () {
  this.deleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/**
 * Record click
 */
notificationSchema.methods.recordClick = async function () {
  this.clicks += 1;
  return this.save();
};

/**
 * Record conversion
 */
notificationSchema.methods.recordConversion = async function () {
  this.conversions += 1;
  return this.save();
};

/**
 * Record delivery attempt
 */
notificationSchema.methods.recordDeliveryAttempt = async function (success, error = null) {
  this.deliveryAttempts += 1;

  if (success) {
    this.deliveryStatus = 'delivered';
    this.status = 'sent';
  } else {
    if (this.deliveryAttempts < this.maxDeliveryAttempts) {
      this.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 mins
    } else {
      this.deliveryStatus = 'failed';
      this.status = 'failed';
    }
  }

  return this.save();
};

/**
 * Mark push notification sent
 */
notificationSchema.methods.markPushSent = async function (token, timestamp = null) {
  this.channels.push.sent = true;
  this.channels.push.sentAt = timestamp || new Date();
  this.channels.push.deliveryToken = token;
  return this.save();
};

/**
 * Mark push notification failed
 */
notificationSchema.methods.markPushFailed = async function (reason) {
  this.channels.push.sent = false;
  this.channels.push.failureReason = reason;
  return this.save();
};

/**
 * Mark email sent
 */
notificationSchema.methods.markEmailSent = async function (email, timestamp = null) {
  this.channels.email.sent = true;
  this.channels.email.sentAt = timestamp || new Date();
  this.channels.email.recipientEmail = email;
  return this.save();
};

/**
 * Mark email failed
 */
notificationSchema.methods.markEmailFailed = async function (reason) {
  this.channels.email.sent = false;
  this.channels.email.failureReason = reason;
  return this.save();
};

/**
 * Mark SMS sent
 */
notificationSchema.methods.markSmsSent = async function (phone, messageId, timestamp = null) {
  this.channels.sms.sent = true;
  this.channels.sms.sentAt = timestamp || new Date();
  this.channels.sms.recipientPhone = phone;
  this.channels.sms.messageId = messageId;
  return this.save();
};

/**
 * Mark SMS failed
 */
notificationSchema.methods.markSmsFailed = async function (reason) {
  this.channels.sms.sent = false;
  this.channels.sms.failureReason = reason;
  return this.save();
};

/**
 * Mark in-app shown
 */
notificationSchema.methods.markInAppShown = async function (timestamp = null) {
  this.channels.inApp.shown = true;
  this.channels.inApp.shownAt = timestamp || new Date();
  return this.save();
};

/**
 * Get delivery summary
 */
notificationSchema.methods.getDeliverySummary = function () {
  return {
    push: this.channels.push.sent,
    email: this.channels.email.sent,
    sms: this.channels.sms.sent,
    inApp: this.channels.inApp.shown,
    totalChannels: 4,
    deliveredChannels:
      Number(this.channels.push.sent) +
      Number(this.channels.email.sent) +
      Number(this.channels.sms.sent) +
      Number(this.channels.inApp.shown)
  };
};

module.exports = mongoose.model('Notification', notificationSchema);
