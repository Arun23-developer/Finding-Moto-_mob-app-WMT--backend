const mongoose = require('mongoose');

/**
 * Review Schema
 * Handles reviews for products, services, sellers, mechanics, and delivery agents
 */
const reviewSchema = new mongoose.Schema(
  {
    reviewType: {
      type: String,
      enum: ['product', 'service', 'seller', 'mechanic', 'delivery_agent'],
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Delivery'
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reviewerName: String,
    reviewerPhoto: String,
    
    // Rating
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    
    // Review content
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    
    // Media
    images: [String],
    videos: [String],
    
    // Specifics
    qualityRating: Number, // for products
    priceRating: Number,
    valueForMoneyRating: Number,
    
    deliverySpeedRating: Number, // for delivery
    behaviourRating: Number,
    clelinessRating: Number,
    
    serviceQualityRating: Number, // for services/mechanics
    professionalismRating: Number,
    timelinessRating: Number,
    
    // Verification
    verifiedPurchase: {
      type: Boolean,
      default: false
    },
    
    // Sentiment (can be from AI)
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    sentimentScore: Number, // 0-1
    
    // Moderation
    approved: {
      type: Boolean,
      default: false
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    moderationNotes: String,
    moderatedBy: mongoose.Schema.Types.ObjectId,
    moderatedAt: Date,
    rejectionReason: String,
    
    // Tags/Keywords
    tags: [
      {
        type: String,
        enum: [
          'authentic',
          'genuine',
          'original',
          'fake',
          'defective',
          'broken',
          'expired',
          'fast_delivery',
          'slow_delivery',
          'professional',
          'unprofessional',
          'good_quality',
          'poor_quality',
          'value_for_money',
          'expensive',
          'cheap',
          'reliable',
          'unreliable',
          'friendly',
          'rude',
          'clean',
          'dirty',
          'on_time',
          'late'
        ]
      }
    ],
    
    // Responses
    response: {
      content: String,
      respondedAt: Date,
      responderId: mongoose.Schema.Types.ObjectId,
      responderName: String
    },
    
    // Helpfulness
    helpfulCount: {
      type: Number,
      default: 0
    },
    notHelpfulCount: {
      type: Number,
      default: 0
    },
    
    // Admin flags
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    flaggedAt: Date,
    flaggedBy: mongoose.Schema.Types.ObjectId,
    
    // Visibility
    visibility: {
      type: String,
      enum: ['public', 'private', 'hidden'],
      default: 'public'
    }
  },
  { timestamps: true }
);

/**
 * Index for finding reviews by target and reviewer
 */
reviewSchema.index({ targetId: 1, reviewType: 1 });
reviewSchema.index({ reviewerId: 1, reviewType: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ approvalStatus: 1, reviewType: 1 });

/**
 * Mark review as helpful
 */
reviewSchema.methods.markHelpful = async function () {
  this.helpfulCount += 1;
  return this.save();
};

/**
 * Mark review as not helpful
 */
reviewSchema.methods.markNotHelpful = async function () {
  this.notHelpfulCount += 1;
  return this.save();
};

/**
 * Get helpfulness percentage
 */
reviewSchema.methods.getHelpfulnessPercentage = function () {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return Math.round((this.helpfulCount / total) * 100);
};

/**
 * Add response from seller/mechanic/agent
 */
reviewSchema.methods.addResponse = async function (content, responderId, responderName) {
  this.response = {
    content,
    respondedAt: new Date(),
    responderId,
    responderName
  };
  return this.save();
};

/**
 * Flag review
 */
reviewSchema.methods.flagReview = async function (reason, flaggedBy) {
  this.isFlagged = true;
  this.flagReason = reason;
  this.flaggedAt = new Date();
  this.flaggedBy = flaggedBy;
  return this.save();
};

/**
 * Approve review (by admin/moderator)
 */
reviewSchema.methods.approve = async function (moderatedBy) {
  this.approved = true;
  this.moderationStatus = 'approved';
  this.visibility = 'public';
  this.moderatedBy = moderatedBy;
  this.moderatedAt = new Date();
  return this.save();
};

/**
 * Reject review (by admin/moderator)
 */
reviewSchema.methods.reject = async function (reason, moderatedBy) {
  this.approved = false;
  this.moderationStatus = 'rejected';
  this.visibility = 'hidden';
  this.rejectionReason = reason;
  this.moderatedBy = moderatedBy;
  this.moderatedAt = new Date();
  return this.save();
};

/**
 * Get average rating display
 */
reviewSchema.methods.getStarDisplay = function () {
  return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
};

module.exports = mongoose.model('Review', reviewSchema);
