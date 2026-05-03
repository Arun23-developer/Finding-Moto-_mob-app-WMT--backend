const mongoose = require('mongoose');

/**
 * Booking Schema
 * Handles mechanic service bookings
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    serviceName: String,
    serviceCategory: String,
    
    // Vehicle info
    vehicle: {
      type: String,
      required: true,
      description: 'Make Model Year'
    },
    registrationNumber: String,
    licensePlate: String,
    
    // Booking details
    scheduledDate: {
      type: Date,
      required: true,
      index: true
    },
    
    startTime: String, // HH:MM format
    endTime: String,
    estimatedDuration: Number, // in minutes
    
    serviceType: {
      type: String,
      enum: ['standard', 'emergency'],
      default: 'standard'
    },
    
    // Pricing
    pricing: {
      servicePrice: Number,
      partsEstimate: Number,
      discount: Number,
      tax: Number,
      totalEstimate: Number,
      currency: {
        type: String,
        default: 'INR'
      }
    },
    
    // Actual pricing (after completion)
    actualPricing: {
      serviceCharge: Number,
      partsCharge: Number,
      labor: Number,
      tax: Number,
      totalAmount: Number,
      finalizedAt: Date
    },
    
    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'refunded'],
      default: 'pending'
    },
    
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'cash', 'netbanking'],
      default: 'cash'
    },
    
    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled'
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
    
    // Location
    location: {
      type: {
        type: String,
        enum: ['mechanic_workshop', 'customer_location'],
        default: 'mechanic_workshop'
      },
      street: String,
      city: String,
      state: String,
      zipCode: String,
      latitude: Number,
      longitude: Number,
      instructions: String
    },
    
    // Customer contact
    customerPhone: String,
    customerEmail: String,
    
    // Mechanic details
    mechanicName: String,
    mechanicPhone: String,
    mechanicRating: Number,
    
    // Description of work needed
    description: {
      type: String,
      required: true
    },
    
    // Problem details
    problemType: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    
    // Actual work done
    workDetails: {
      startedAt: Date,
      completedAt: Date,
      partsReplaced: [String],
      workDescription: String,
      mechanicNotes: String
    },
    
    // Parts used
    partsUsed: [
      {
        partId: mongoose.Schema.Types.ObjectId,
        partName: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number
      }
    ],
    
    // Warranty on service
    warranty: {
      applicable: Boolean,
      type: {
        type: String,
        enum: ['parts', 'labor', 'both']
      },
      validUpto: Date,
      coverage: String
    },
    
    // Follow-up required
    followUpRequired: Boolean,
    followUpDate: Date,
    followUpNotes: String,
    
    // Ratings
    customerRating: {
      rating: Number,
      review: String,
      ratedAt: Date
    },
    
    mechanicRatingByCustomer: {
      rating: Number,
      review: String,
      ratedAt: Date
    },
    
    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'mechanic', 'system']
    },
    
    // Reschedule
    rescheduledFrom: mongoose.Schema.Types.ObjectId,
    rescheduleReason: String,
    rescheduleCount: {
      type: Number,
      default: 0
    },
    
    // Documents
    invoiceNumber: String,
    receiptUrl: String,
    serviceReport: String,
    
    // Notifications
    notificationsSent: {
      confirmationSent: Boolean,
      reminderSent: Boolean,
      completionSent: Boolean,
      invoiceSent: Boolean
    },
    
    // No show tracking
    noShowCount: {
      type: Number,
      default: 0
    },
    
    // Additional services offered (upsell)
    additionalServices: [
      {
        name: String,
        offered: Boolean,
        accepted: Boolean,
        price: Number
      }
    ],
    
    // Tags
    tags: [String],
    
    // Internal notes
    internalNotes: String
  },
  { timestamps: true }
);

/**
 * Generate booking number
 */
bookingSchema.pre('save', async function (next) {
  if (!this.bookingNumber) {
    const count = await this.constructor.countDocuments();
    this.bookingNumber = `BKG-${Date.now()}-${count + 1}`;
  }
  next();
});

/**
 * Update booking status
 */
bookingSchema.methods.updateStatus = async function (newStatus, notes = '', updatedBy = 'system') {
  this.status = newStatus;
  this.statusTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
    updatedBy
  });

  if (newStatus === 'in_progress') {
    this.workDetails.startedAt = new Date();
  }

  if (newStatus === 'completed') {
    this.workDetails.completedAt = new Date();
  }

  return this.save();
};

/**
 * Mark booking complete with actual pricing
 */
bookingSchema.methods.completeBooking = async function (serviceCharge, partsCharge, mechanic Notes = '') {
  this.status = 'completed';
  this.workDetails.completedAt = new Date();
  this.workDetails.mechanicNotes = mechanicNotes;

  const tax = (serviceCharge + partsCharge) * 0.18; // 18% GST

  this.actualPricing = {
    serviceCharge,
    partsCharge,
    labor: serviceCharge,
    tax,
    totalAmount: serviceCharge + partsCharge + tax,
    finalizedAt: new Date()
  };

  this.statusTimeline.push({
    status: 'completed',
    timestamp: new Date(),
    notes: 'Service completed'
  });

  return this.save();
};

/**
 * Cancel booking
 */
bookingSchema.methods.cancelBooking = async function (reason, cancelledBy = 'customer') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;

  // Refund if payment completed
  if (this.paymentStatus === 'completed') {
    this.paymentStatus = 'refunded';
  }

  return this.save();
};

/**
 * Reschedule booking
 */
bookingSchema.methods.rescheduleBooking = async function (newDate, newTime, reason) {
  const oldBooking = await this.constructor.findById(this._id);

  // Create reference to original booking
  this.rescheduledFrom = oldBooking._id;
  this.rescheduleReason = reason;
  this.rescheduleCount += 1;
  this.scheduledDate = newDate;
  this.startTime = newTime;

  this.statusTimeline.push({
    status: 'rescheduled',
    timestamp: new Date(),
    notes: `Rescheduled from ${oldBooking.scheduledDate} to ${newDate}`
  });

  return this.save();
};

/**
 * Mark no-show
 */
bookingSchema.methods.markNoShow = async function () {
  this.status = 'no_show';
  this.noShowCount += 1;

  this.statusTimeline.push({
    status: 'no_show',
    timestamp: new Date(),
    notes: 'Customer did not show up'
  });

  return this.save();
};

/**
 * Add rating
 */
bookingSchema.methods.addRating = async function (rating, review) {
  this.mechanicRatingByCustomer = {
    rating,
    review,
    ratedAt: new Date()
  };

  return this.save();
};

/**
 * Add work details
 */
bookingSchema.methods.updateWorkDetails = async function (partsReplaced, description) {
  this.workDetails.partsReplaced = partsReplaced;
  this.workDetails.workDescription = description;

  return this.save();
};

/**
 * Calculate total amount
 */
bookingSchema.methods.calculateTotal = function () {
  if (this.actualPricing && this.actualPricing.totalAmount) {
    return this.actualPricing.totalAmount;
  }

  return this.pricing.totalEstimate || 0;
};

module.exports = mongoose.model('Booking', bookingSchema);
