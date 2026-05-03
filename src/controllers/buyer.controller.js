const SparePart = require('../models/SparePart');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Delivery = require('../models/Delivery');
const logger = require('../utils/logger');
const { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } = require('../middleware/errorMiddleware');

/**
 * Browse all products with filters
 */
const browseProducts = asyncHandler(async (req, res) => {
  const { category, minPrice, maxPrice, rating, search, sellerId } = req.query;
  const { limit, skip } = req.pagination;
  const sort = req.sort;

  const filters = { status: 'active', approvalStatus: 'approved' };

  if (category) filters.category = category;
  if (sellerId) filters.sellerId = sellerId;
  if (search) {
    filters.$text = { $search: search };
  }

  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = parseFloat(minPrice);
    if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
  }

  if (rating) {
    filters['ratings.averageRating'] = { $gte: parseFloat(rating) };
  }

  const total = await SparePart.countDocuments(filters);
  const products = await SparePart.find(filters)
    .populate('sellerId', 'businessName phone email')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  // Increment view count
  await SparePart.updateMany(
    { _id: { $in: products.map((p) => p._id) } },
    { $inc: { viewCount: 1 } }
  );

  res.status(200).json({
    success: true,
    message: 'Products fetched successfully',
    data: {
      products,
      pagination: {
        total,
        page: req.pagination.page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get product details
 */
const getProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await SparePart.findById(productId).populate(
    'sellerId',
    'businessName phone email ratings'
  );

  if (!product) {
    throw new NotFoundError('Product');
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  // Get reviews
  const reviews = await Review.find({
    reviewType: 'product',
    targetId: productId,
    visibility: 'public',
    approved: true
  })
    .populate('reviewerId', 'firstName lastName profilePhoto')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    message: 'Product details fetched successfully',
    data: {
      product,
      reviews
    }
  });
});

/**
 * Add item to cart
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const buyerId = req.user.id;

  if (!productId || !quantity) {
    throw new BadRequestError('Product ID and quantity are required');
  }

  // Verify product exists
  const product = await SparePart.findById(productId);

  if (!product) {
    throw new NotFoundError('Product');
  }

  if (!product.isInStock()) {
    throw new BadRequestError('Product is not in stock');
  }

  if (quantity > product.available) {
    throw new BadRequestError(`Only ${product.available} items available`);
  }

  // Get or create cart
  let cart = await Cart.findOne({ buyerId });

  if (!cart) {
    cart = new Cart({ buyerId });
  }

  // Add item to cart
  await cart.addItem(productId, quantity, product.price, product.sellerId, product.sellerName);

  logger.info('Item added to cart', {
    userId: buyerId,
    productId,
    quantity
  });

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: { cart }
  });
});

/**
 * Get cart
 */
const getCart = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;

  let cart = await Cart.findOne({ buyerId }).populate('items.productId');

  if (!cart) {
    cart = new Cart({ buyerId });
    await cart.save();
  }

  res.status(200).json({
    success: true,
    message: 'Cart fetched successfully',
    data: { cart }
  });
});

/**
 * Update cart item quantity
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const buyerId = req.user.id;

  if (!productId || !quantity) {
    throw new BadRequestError('Product ID and quantity are required');
  }

  const cart = await Cart.findOne({ buyerId });

  if (!cart) {
    throw new NotFoundError('Cart');
  }

  await cart.updateQuantity(productId, quantity);

  res.status(200).json({
    success: true,
    message: 'Cart updated successfully',
    data: { cart }
  });
});

/**
 * Remove item from cart
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const buyerId = req.user.id;

  const cart = await Cart.findOne({ buyerId });

  if (!cart) {
    throw new NotFoundError('Cart');
  }

  await cart.removeItem(productId);

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: { cart }
  });
});

/**
 * Place order
 */
const placeOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  const buyerId = req.user.id;

  if (!items || items.length === 0) {
    throw new BadRequestError('Order must contain at least one item');
  }

  if (!shippingAddress || !paymentMethod) {
    throw new BadRequestError('Shipping address and payment method are required');
  }

  // Calculate order total
  let subtotal = 0;

  for (const item of items) {
    const product = await SparePart.findById(item.productId);

    if (!product) {
      throw new NotFoundError(`Product ${item.productId}`);
    }

    if (item.quantity > product.available) {
      throw new BadRequestError(`Insufficient stock for ${product.name}`);
    }

    subtotal += product.price * item.quantity;
  }

  // Create order
  const order = new Order({
    buyerId,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: 0, // Will be set from product
      totalPrice: 0
    })),
    shippingAddress,
    payment: {
      method: paymentMethod,
      status: 'pending'
    },
    pricing: {
      subtotal,
      tax: subtotal * 0.18, // 18% GST
      shippingCost: 100,
      discount: 0,
      totalAmount: subtotal * 1.18 + 100
    }
  });

  // TODO: Process payment via Razorpay

  await order.save();

  logger.info('Order placed successfully', {
    userId: buyerId,
    orderId: order._id,
    amount: order.pricing.totalAmount
  });

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: { order }
  });
});

/**
 * Get orders
 */
const getOrders = asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { status } = req.query;
  const { limit, skip } = req.pagination;
  const sort = req.sort;

  const filters = { buyerId };

  if (status) filters.status = status;

  const total = await Order.countDocuments(filters);
  const orders = await Order.find(filters)
    .populate('items.productId', 'name price images')
    .populate('sellerId', 'businessName phone')
    .sort(sort)
    .limit(limit)
    .skip(skip);

  res.status(200).json({
    success: true,
    message: 'Orders fetched successfully',
    data: {
      orders,
      pagination: {
        total,
        page: req.pagination.page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get order details
 */
const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const buyerId = req.user.id;

  const order = await Order.findById(orderId)
    .populate('items.productId')
    .populate('sellerId', 'businessName phone email')
    .populate('deliveryId');

  if (!order) {
    throw new NotFoundError('Order');
  }

  // Check ownership
  if (order.buyerId.toString() !== buyerId) {
    throw new ForbiddenError('You do not have access to this order');
  }

  res.status(200).json({
    success: true,
    message: 'Order details fetched successfully',
    data: { order }
  });
});

/**
 * Track delivery
 */
const trackDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const buyerId = req.user.id;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.buyerId.toString() !== buyerId) {
    throw new ForbiddenError('You do not have access to this order');
  }

  const delivery = await Delivery.findById(order.deliveryId);

  if (!delivery) {
    throw new NotFoundError('Delivery');
  }

  res.status(200).json({
    success: true,
    message: 'Delivery tracking fetched successfully',
    data: {
      delivery: {
        status: delivery.status,
        currentLocation: delivery.currentLocation,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        trackingHistory: delivery.trackingHistory,
        agentDetails: {
          name: delivery.assignedAgent?.name,
          phone: delivery.assignedAgent?.phone,
          rating: delivery.ratings?.agentRating
        }
      }
    }
  });
});

/**
 * Add review
 */
const addReview = asyncHandler(async (req, res) => {
  const { orderId, productRating, sellerRating, review, images } = req.body;
  const reviewerId = req.user.id;

  if (!orderId || !productRating || !review) {
    throw new BadRequestError('Order ID, rating, and review are required');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (order.buyerId.toString() !== reviewerId) {
    throw new ForbiddenError('You can only review your own orders');
  }

  if (order.status !== 'delivered') {
    throw new BadRequestError('Can only review delivered orders');
  }

  // Create product review
  const productReview = new Review({
    reviewType: 'product',
    targetId: order.items[0].productId,
    orderId,
    reviewerId,
    rating: productRating,
    title: 'Product Review',
    comment: review,
    images,
    verifiedPurchase: true
  });

  // Create seller review
  const sellerReview = new Review({
    reviewType: 'seller',
    targetId: order.sellerId,
    orderId,
    reviewerId,
    rating: sellerRating || productRating,
    title: 'Seller Review',
    comment: review,
    images,
    verifiedPurchase: true
  });

  await Promise.all([productReview.save(), sellerReview.save()]);

  // Update order with rating
  await order.addRating(productRating, sellerRating, 0, review, images);

  logger.info('Review added successfully', {
    userId: reviewerId,
    orderId,
    productId: order.items[0].productId
  });

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: {
      productReview,
      sellerReview
    }
  });
});

module.exports = {
  browseProducts,
  getProductDetails,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  placeOrder,
  getOrders,
  getOrderDetails,
  trackDelivery,
  addReview
};
