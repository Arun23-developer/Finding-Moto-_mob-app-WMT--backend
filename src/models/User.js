const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Supports multiple roles: buyer, seller, mechanic, delivery, admin
 */
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['buyer', 'seller', 'mechanic', 'delivery', 'admin'],
        message: 'Invalid role'
      },
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive', 'deleted'],
      default: 'active'
    },
    profilePhoto: {
      type: String,
      default: null
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      latitude: Number,
      longitude: Number
    },
    kyc: {
      verified: {
        type: Boolean,
        default: false
      },
      identityProof: String,
      addressProof: String,
      verifiedAt: Date,
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      }
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
    
    // Seller specific fields
    businessName: String,
    businessRegistration: String,
    taxId: String,
    returnPolicy: String,
    
    // Mechanic specific fields
    licenseNumber: String,
    licenseExpiry: Date,
    certifications: [
      {
        name: String,
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String
      }
    ],
    serviceRadius: Number, // in km
    serviceCategories: [String],
    
    // Delivery Agent specific fields
    vehicleNumber: String,
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'scooter', 'car', 'van']
    },
    currentLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    
    // Bank account (for payouts)
    bankAccount: {
      accountHolderName: String,
      accountNumber: String, // encrypted
      ifscCode: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    
    // Metadata
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    devices: [
      {
        deviceId: String,
        deviceName: String,
        lastActiveAt: Date
      }
    ]
  },
  { timestamps: true }
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Hide sensitive fields
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.bankAccount.accountNumber;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

/**
 * Get full name
 */
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Check if account is locked
 */
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

/**
 * Handle failed login attempt
 */
userSchema.methods.recordFailedLogin = function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // Lock for 2 hours
  }
  return this.save();
};

/**
 * Reset login attempts
 */
userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
