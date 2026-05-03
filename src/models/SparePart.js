const mongoose = require('mongoose');

/**
 * SparePart Schema
 * For products sold by sellers and mechanics
 */
const sparePartSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      text: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      text: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'engine',
        'brakes',
        'suspension',
        'electrical',
        'transmission',
        'fuel',
        'cooling',
        'steering',
        'chassis',
        'interior',
        'exterior',
        'other'
      ]
    },
    subcategory: String,
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    reserved: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: function () {
        return this.quantity - this.reserved;
      }
    },
    images: [String],
    specifications: {
      brand: String,
      model: String,
      compatibility: [String],
      material: String,
      weight: String,
      dimensions: String
    },
    warranty: {
      duration: Number, // in months
      type: {
        type: String,
        enum: ['manufacturer', 'seller', 'none']
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived', 'out_of_stock'],
      default: 'active'
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    rejectionReason: String,
    
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
    
    priceHistory: [
      {
        price: Number,
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    viewCount: {
      type: Number,
      default: 0
    },
    
    salesCount: {
      type: Number,
      default: 0
    },
    
    searchKeywords: [String],
    
    isNew: {
      type: Boolean,
      default: true
    },
    
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/**
 * Update available quantity when reserved changes
 */
sparePartSchema.pre('save', function (next) {
  this.available = this.quantity - this.reserved;
  if (this.available < 0) {
    return next(new Error('Available quantity cannot be negative'));
  }
  next();
});

/**
 * Reduce stock when product is ordered
 */
sparePartSchema.methods.reserveStock = async function (quantity) {
  if (this.available < quantity) {
    throw new Error('Insufficient stock available');
  }
  this.reserved += quantity;
  return this.save();
};

/**
 * Release reserved stock (for cancellations)
 */
sparePartSchema.methods.releaseStock = async function (quantity) {
  this.reserved = Math.max(0, this.reserved - quantity);
  return this.save();
};

/**
 * Confirm purchase (move from reserved to sold)
 */
sparePartSchema.methods.confirmPurchase = async function (quantity) {
  if (this.reserved < quantity) {
    throw new Error('Not enough reserved stock');
  }
  this.reserved -= quantity;
  this.quantity -= quantity;
  this.salesCount += 1;
  return this.save();
};

/**
 * Get formatted price
 */
sparePartSchema.methods.getFormattedPrice = function () {
  return `${this.currency} ${this.price.toLocaleString()}`;
};

/**
 * Check if in stock
 */
sparePartSchema.methods.isInStock = function () {
  return this.available > 0 && this.status === 'active';
};

/**
 * Get discount percentage
 */
sparePartSchema.methods.getDiscountPercentage = function () {
  if (!this.costPrice || !this.price) return 0;
  return Math.round(((this.costPrice - this.price) / this.costPrice) * 100);
};

module.exports = mongoose.model('SparePart', sparePartSchema);
