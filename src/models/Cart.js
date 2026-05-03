const mongoose = require('mongoose');

/**
 * Cart Schema
 * Handles user shopping cart
 */
const cartSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SparePart',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1
        },
        unitPrice: Number,
        totalPrice: Number,
        addedAt: {
          type: Date,
          default: Date.now
        },
        seller: {
          sellerId: mongoose.Schema.Types.ObjectId,
          sellerName: String
        }
      }
    ],
    
    subtotal: {
      type: Number,
      default: 0
    },
    
    // Discounts
    appliedPromo: {
      code: String,
      discount: Number,
      discountType: {
        type: String,
        enum: ['percentage', 'flat']
      },
      appliedAt: Date
    },
    
    // Shipping
    estimatedShippingCost: {
      type: Number,
      default: 0
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    
    // Tax
    estimatedTax: {
      type: Number,
      default: 0
    },
    
    // Total
    total: {
      type: Number,
      default: 0
    },
    
    // Wishlist items (for later)
    wishlistItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SparePart'
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Cart status
    status: {
      type: String,
      enum: ['active', 'abandoned', 'converted'],
      default: 'active'
    },
    
    // Metadata
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    abandonedAt: Date,
    recoveryEmailSent: Boolean,
    recoveryEmailSentAt: Date
  },
  { timestamps: true }
);

/**
 * Add item to cart
 */
cartSchema.methods.addItem = async function (productId, quantity, unitPrice, sellerId, sellerName) {
  const existingItem = this.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
  } else {
    this.items.push({
      productId,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      seller: {
        sellerId,
        sellerName
      },
      addedAt: new Date()
    });
  }

  this.lastUpdated = new Date();
  return this.calculateTotal();
};

/**
 * Remove item from cart
 */
cartSchema.methods.removeItem = async function (productId) {
  this.items = this.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );

  this.lastUpdated = new Date();
  return this.calculateTotal();
};

/**
 * Update item quantity
 */
cartSchema.methods.updateQuantity = async function (productId, quantity) {
  const item = this.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (!item) {
    throw new Error('Product not found in cart');
  }

  if (quantity <= 0) {
    return this.removeItem(productId);
  }

  item.quantity = quantity;
  item.totalPrice = item.unitPrice * quantity;

  this.lastUpdated = new Date();
  return this.calculateTotal();
};

/**
 * Clear cart
 */
cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.subtotal = 0;
  this.total = 0;
  this.appliedPromo = null;
  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Calculate total
 */
cartSchema.methods.calculateTotal = async function () {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Apply promo discount
  let discount = 0;
  if (this.appliedPromo) {
    if (this.appliedPromo.discountType === 'percentage') {
      discount = (this.subtotal * this.appliedPromo.discount) / 100;
    } else {
      discount = this.appliedPromo.discount;
    }
  }

  // Calculate total
  this.total =
    this.subtotal +
    (this.estimatedTax || 0) +
    (this.estimatedShippingCost || 0) -
    discount;

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Apply promo code
 */
cartSchema.methods.applyPromo = async function (code, discount, discountType) {
  this.appliedPromo = {
    code,
    discount,
    discountType,
    appliedAt: new Date()
  };

  return this.calculateTotal();
};

/**
 * Remove promo code
 */
cartSchema.methods.removePromo = async function () {
  this.appliedPromo = null;
  return this.calculateTotal();
};

/**
 * Add to wishlist
 */
cartSchema.methods.addToWishlist = async function (productId) {
  const exists = this.wishlistItems.some(
    (item) => item.productId.toString() === productId.toString()
  );

  if (!exists) {
    this.wishlistItems.push({
      productId,
      addedAt: new Date()
    });
  }

  return this.save();
};

/**
 * Remove from wishlist
 */
cartSchema.methods.removeFromWishlist = async function (productId) {
  this.wishlistItems = this.wishlistItems.filter(
    (item) => item.productId.toString() !== productId.toString()
  );

  return this.save();
};

/**
 * Get cart item count
 */
cartSchema.methods.getItemCount = function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
};

/**
 * Mark cart as abandoned
 */
cartSchema.methods.markAbandoned = async function () {
  this.status = 'abandoned';
  this.abandonedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);
