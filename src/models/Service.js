const mongoose = require('mongoose');

/**
 * Service Schema
 * For services offered by mechanics
 */
const serviceSchema = new mongoose.Schema(
  {
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Service description is required']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'engine_repair',
        'brake_service',
        'oil_change',
        'battery_replacement',
        'tire_service',
        'suspension',
        'electrical',
        'diagnostics',
        'maintenance',
        'customization',
        'other'
      ]
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    estimatedDuration: {
      type: Number,
      required: [true, 'Estimated duration is required'],
      min: [15, 'Duration must be at least 15 minutes']
    },
    includesPartsCost: {
      type: Boolean,
      default: false
    },
    availableSlots: {
      startTime: String, // HH:MM format
      endTime: String,
      slotDuration: {
        type: Number,
        default: 30
      },
      maxBookingsPerDay: {
        type: Number,
        default: 10
      }
    },
    serviceType: {
      type: String,
      enum: ['standard', 'emergency'],
      default: 'standard'
    },
    warranty: {
      duration: Number, // in months
      type: {
        type: String,
        enum: ['parts', 'labor', 'both']
      },
      coverage: String
    },
    ratings: {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalReviews: {
        type: Number,
        default: 0
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active'
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    completedServices: {
      type: Number,
      default: 0
    },
    cancelledServices: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100
    },
    images: [String],
    priceHistory: [
      {
        basePrice: Number,
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

/**
 * Update success rate
 */
serviceSchema.methods.updateSuccessRate = function () {
  const total = this.completedServices + this.cancelledServices;
  if (total > 0) {
    this.successRate = Math.round((this.completedServices / total) * 100);
  }
  return this.save();
};

/**
 * Get availability slots for a date range
 */
serviceSchema.methods.getAvailableSlots = function (startDate, endDate) {
  const slots = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    // Check if not a holiday/blocked
    const daySlots = this.generateDaySlots(new Date(date));
    slots.push(...daySlots);
  }

  return slots;
};

/**
 * Generate time slots for a single day
 */
serviceSchema.methods.generateDaySlots = function (date) {
  const slots = [];
  const startTime = this.availableSlots.startTime.split(':');
  const endTime = this.availableSlots.endTime.split(':');
  const duration = this.availableSlots.slotDuration;

  let current = new Date(date);
  current.setHours(parseInt(startTime[0]), parseInt(startTime[1]));

  const dayEnd = new Date(date);
  dayEnd.setHours(parseInt(endTime[0]), parseInt(endTime[1]));

  while (current < dayEnd) {
    const slotEnd = new Date(current);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    slots.push({
      startTime: new Date(current),
      endTime: slotEnd,
      available: true
    });

    current = slotEnd;
  }

  return slots;
};

/**
 * Increment booking count
 */
serviceSchema.methods.incrementBooking = async function () {
  this.bookingCount += 1;
  return this.save();
};

/**
 * Record completed service
 */
serviceSchema.methods.recordCompletion = async function () {
  this.completedServices += 1;
  return this.updateSuccessRate();
};

/**
 * Record cancelled service
 */
serviceSchema.methods.recordCancellation = async function () {
  this.cancelledServices += 1;
  return this.updateSuccessRate();
};

module.exports = mongoose.model('Service', serviceSchema);
