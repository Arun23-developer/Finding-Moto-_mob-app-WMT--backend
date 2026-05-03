const mongoose = require('mongoose');

/**
 * Dispute Schema
 * Handles disputes between buyers and sellers/mechanics
 */
const disputeSchema = new mongoose.Schema(
  {
    disputeNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    
    disputeType: {
      type: String,
      enum: ['order', 'service', 'payment', 'refund', 'delivery', 'quality', 'other'],
      required: true,
      index: true
    },
    
    status: {
      type: String,
      enum: ['open', 'under_review', 'in_progress', 'escalated', 'resolved', 'closed', 'appealed'],
      default: 'open',
      index: true
    },
    
    resolution: {
      type: String,
      enum: ['pending', 'refund_issued', 'replacement_sent', 'cancel_order', 'mediation', 'dismissed', 'appealed']
    },
    
    // Parties involved
    complainantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    complainantRole: {
      type: String,
      enum: ['buyer', 'seller', 'mechanic', 'delivery_agent'],
      required: true
    },
    
    respondentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    respondentRole: {
      type: String,
      enum: ['buyer', 'seller', 'mechanic', 'delivery_agent'],
      required: true
    },
    
    // Reference
    referenceType: {
      type: String,
      enum: ['order', 'booking', 'delivery', 'payment'],
      required: true
    },
    
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    
    // Complaint details
    title: {
      type: String,
      required: true
    },
    
    description: {
      type: String,
      required: true
    },
    
    category: {
      type: String,
      enum: [
        'product_defective',
        'product_not_received',
        'product_not_as_described',
        'delivery_delay',
        'delivery_failed',
        'payment_not_received',
        'payment_duplicate_charge',
        'service_not_provided',
        'service_incomplete',
        'rude_behavior',
        'damaged_items',
        'missing_items',
        'fraud',
        'return_not_processed',
        'refund_not_received',
        'other'
      ],
      required: true
    },
    
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    
    // Evidence
    evidence: {
      complainantEvidence: [
        {
          type: {
            type: String,
            enum: ['photo', 'video', 'document', 'text', 'message', 'receipt']
          },
          url: String,
          description: String,
          uploadedAt: Date
        }
      ],
      respondentEvidence: [
        {
          type: {
            type: String,
            enum: ['photo', 'video', 'document', 'text', 'message', 'receipt']
          },
          url: String,
          description: String,
          uploadedAt: Date
        }
      ]
    },
    
    // Amount involved
    amount: {
      claimed: Number,
      resolved: Number,
      currency: {
        type: String,
        default: 'INR'
      }
    },
    
    // Resolution details
    requestedResolution: {
      type: String,
      enum: ['refund', 'replacement', 'repair', 'partial_refund', 'credit', 'other']
    },
    
    proposedResolution: {
      type: String,
      enum: ['refund', 'replacement', 'repair', 'partial_refund', 'credit', 'other']
    },
    
    resolvedOn: {
      type: String,
      enum: ['refund', 'replacement', 'repair', 'partial_refund', 'credit', 'dismissed', 'appealed']
    },
    
    // Timeline
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    complainantResponseDeadline: Date,
    respondentResponseDeadline: Date,
    
    complainantRespondedAt: Date,
    respondentRespondedAt: Date,
    
    complainantResponse: {
      message: String,
      evidence: [String],
      respondedAt: Date
    },
    
    respondentResponse: {
      message: String,
      evidence: [String],
      respondedAt: Date
    },
    
    // Admin review
    assignedTo: {
      adminId: mongoose.Schema.Types.ObjectId,
      assignedAt: Date
    },
    
    adminNotes: String,
    
    // Mediation
    mediationAttempted: Boolean,
    mediationNotes: String,
    mediationDate: Date,
    mediationSuccessful: Boolean,
    
    // Final decision
    decision: {
      by: mongoose.Schema.Types.ObjectId,
      at: Date,
      description: String,
      reasoning: String,
      decision: String
    },
    
    // Approval
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    approverNotes: String,
    
    // Appeal
    appealed: Boolean,
    appealReason: String,
    appealEvidence: [String],
    appealedAt: Date,
    appealStatus: {
      type: String,
      enum: ['pending', 'under_review', 'accepted', 'rejected'],
      default: 'pending'
    },
    
    appealDecision: {
      by: mongoose.Schema.Types.ObjectId,
      at: Date,
      description: String
    },
    
    // Communication
    messages: [
      {
        senderId: mongoose.Schema.Types.ObjectId,
        senderRole: String,
        message: String,
        attachments: [String],
        sentAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Tags
    tags: [String],
    
    // Refund tracking
    refundInitiated: Boolean,
    refundTransactionId: String,
    refundAmount: Number,
    refundInitiatedAt: Date,
    refundCompletedAt: Date,
    
    // Chargeback
    chargebackFiled: Boolean,
    chargebackId: String,
    chargebackAmount: Number,
    chargebackFiIedAt: Date,
    
    // Flags
    isFraud: Boolean,
    fraudIndicators: [String],
    isEscalated: Boolean,
    escalationReason: String,
    
    // Outcome
    outcome: {
      favorsComplainant: Boolean,
      favorsRespondent: Boolean,
      partial: Boolean,
      details: String
    },
    
    // Closure
    closedAt: Date,
    closureReason: String,
    closedBy: mongoose.Schema.Types.ObjectId,
    
    // Follow-up
    followUpRequired: Boolean,
    followUpDate: Date,
    followUpDetails: String
  },
  { timestamps: true }
);

/**
 * Generate dispute number
 */
disputeSchema.pre('save', async function (next) {
  if (!this.disputeNumber) {
    const count = await this.constructor.countDocuments();
    this.disputeNumber = `DIS-${Date.now()}-${count + 1}`;
  }
  next();
});

/**
 * Update dispute status
 */
disputeSchema.methods.updateStatus = async function (newStatus, notes = '', updatedBy = 'system') {
  this.status = newStatus;

  if (notes) {
    this.adminNotes = (this.adminNotes || '') + `\n[${new Date().toISOString()}] ${updatedBy}: ${notes}`;
  }

  return this.save();
};

/**
 * Add complainant response
 */
disputeSchema.methods.addComplainantResponse = async function (message, evidence = []) {
  this.complainantResponse = {
    message,
    evidence,
    respondedAt: new Date()
  };

  this.complainantRespondedAt = new Date();
  this.status = 'under_review';

  this.messages.push({
    senderId: this.complainantId,
    senderRole: this.complainantRole,
    message,
    attachments: evidence,
    sentAt: new Date()
  });

  return this.save();
};

/**
 * Add respondent response
 */
disputeSchema.methods.addRespondentResponse = async function (message, evidence = []) {
  this.respondentResponse = {
    message,
    evidence,
    respondedAt: new Date()
  };

  this.respondentRespondedAt = new Date();

  this.messages.push({
    senderId: this.respondentId,
    senderRole: this.respondentRole,
    message,
    attachments: evidence,
    sentAt: new Date()
  });

  return this.save();
};

/**
 * Resolve dispute
 */
disputeSchema.methods.resolveDispute = async function (resolution, decision, adminId, reasoning = '') {
  this.status = 'resolved';
  this.resolution = resolution;

  this.decision = {
    by: adminId,
    at: new Date(),
    description: decision,
    reasoning,
    decision: resolution
  };

  if (resolution === 'refund_issued' || resolution === 'partial_refund') {
    this.refundInitiated = true;
    this.refundInitiatedAt = new Date();
  }

  return this.save();
};

/**
 * Escalate dispute
 */
disputeSchema.methods.escalate = async function (reason) {
  this.status = 'escalated';
  this.isEscalated = true;
  this.escalationReason = reason;

  return this.save();
};

/**
 * Appeal dispute
 */
disputeSchema.methods.appealDispute = async function (reason, evidence = []) {
  this.appealed = true;
  this.appealReason = reason;
  this.appealEvidence = evidence;
  this.appealedAt = new Date();
  this.status = 'appealed';
  this.appealStatus = 'pending';

  return this.save();
};

/**
 * Close dispute
 */
disputeSchema.methods.closeDispute = async function (reason, closedBy) {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closureReason = reason;
  this.closedBy = closedBy;

  return this.save();
};

/**
 * Mark as fraud
 */
disputeSchema.methods.markAsFraud = async function (indicators = []) {
  this.isFraud = true;
  this.fraudIndicators = indicators;

  return this.save();
};

/**
 * Get timeline
 */
disputeSchema.methods.getTimeline = function () {
  const timeline = [
    {
      event: 'Dispute Created',
      date: this.createdAt,
      actor: 'System'
    }
  ];

  if (this.complainantRespondedAt) {
    timeline.push({
      event: 'Complainant Responded',
      date: this.complainantRespondedAt,
      actor: this.complainantRole
    });
  }

  if (this.respondentRespondedAt) {
    timeline.push({
      event: 'Respondent Responded',
      date: this.respondentRespondedAt,
      actor: this.respondentRole
    });
  }

  if (this.assignedTo) {
    timeline.push({
      event: 'Assigned to Admin',
      date: this.assignedTo.assignedAt,
      actor: 'System'
    });
  }

  if (this.decision && this.decision.at) {
    timeline.push({
      event: 'Decision Made',
      date: this.decision.at,
      actor: 'Admin',
      decision: this.decision.description
    });
  }

  if (this.closedAt) {
    timeline.push({
      event: 'Dispute Closed',
      date: this.closedAt,
      actor: 'Admin'
    });
  }

  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
};

module.exports = mongoose.model('Dispute', disputeSchema);
