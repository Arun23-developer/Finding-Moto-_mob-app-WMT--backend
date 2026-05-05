"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmOrderReceived = exports.updateOrderStatus = exports.getOrders = exports.getOrderStats = exports.cancelBuyerOrder = exports.getBuyerOrders = exports.createOrder = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const mongoose_1 = __importDefault(require("mongoose"));
const orderStatus_1 = require("../utils/orderStatus");
const orderWorkflowEvents_1 = require("../utils/orderWorkflowEvents");
const isPopulatedSeller = (seller) => {
    return typeof seller === 'object' && seller !== null && '_id' in seller;
};
const CANCELLABLE_STATUSES = [
    'pending',
    'awaiting_seller_confirmation',
    'confirmed',
    'processing',
    'ready_for_dispatch',
];
const SELLER_PRE_PICKUP_TARGET_STATUSES = ['confirmed', 'ready_for_dispatch', 'cancelled'];
// ─── Buyer endpoints ────────────────────────────────────────────────────────
// @desc    Create a new order (buyer places order)
// @route   POST /api/orders
// @access  Private/Buyer
const createOrder = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { productId, qty, shippingAddress, paymentMethod, notes } = req.body;
        if (!productId || !shippingAddress) {
            res.status(400).json({ success: false, message: 'Product ID and shipping address are required' });
            return;
        }
        const product = await Product_1.default.findOne({ _id: productId, status: 'active', productStatus: 'ENABLED' })
            .populate('seller', 'firstName lastName shopName')
            .lean();
        if (!product) {
            res.status(404).json({ success: false, message: 'This product/service is currently unavailable' });
            return;
        }
        const quantity = Math.max(1, parseInt(qty) || 1);
        if (product.type !== 'service' && product.stock < quantity) {
            res.status(400).json({ success: false, message: `Only ${product.stock} items in stock` });
            return;
        }
        const totalAmount = product.price * quantity;
        const order = await Order_1.default.create({
            buyer: buyerId,
            seller: product.seller._id || product.seller,
            order_type: product.type === 'service' ? 'service' : 'product',
            items: [
                {
                    product: product._id,
                    name: product.name,
                    price: product.price,
                    qty: quantity,
                    image: product.images?.[0] || '',
                },
            ],
            totalAmount,
            shippingAddress,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            notes: notes || '',
            status: 'awaiting_seller_confirmation',
            statusHistory: [
                { status: 'pending', changedAt: new Date(), note: 'Order placed by buyer' },
                {
                    status: 'awaiting_seller_confirmation',
                    changedAt: new Date(),
                    note: 'Waiting for seller approval',
                },
            ],
        });
        // Decrease product stock (not for services)
        if (product.type !== 'service') {
            await Product_1.default.updateOne({ _id: productId }, { $inc: { stock: -quantity, sales: quantity } });
        }
        else {
            await Product_1.default.updateOne({ _id: productId }, { $inc: { sales: quantity } });
        }
        const orderId = order._id.toString();
        const populatedSeller = isPopulatedSeller(product.seller) ? product.seller : null;
        const sellerUserId = populatedSeller ? String(populatedSeller._id) : String(product.seller);
        const sellerName = populatedSeller
            ? `${populatedSeller.firstName || ''} ${populatedSeller.lastName || ''}`.trim() || populatedSeller.shopName || 'Seller'
            : 'Seller';
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(buyerId),
            audience: 'buyer',
            orderId,
            status: 'awaiting_seller_confirmation',
            title: 'Order placed',
            message: 'Your order has been placed successfully',
            actorRole: 'buyer',
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: sellerUserId,
            audience: 'seller',
            orderId,
            status: 'awaiting_seller_confirmation',
            title: 'New order placed',
            message: `A new order has been placed and is waiting for confirmation from ${sellerName}`,
            actorRole: 'buyer',
        });
        res.status(201).json({ success: true, data: order });
    }
    catch (err) {
        console.error('createOrder error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createOrder = createOrder;
// @desc    Get buyer's own orders
// @route   GET /api/orders/my
// @access  Private/Buyer
const getBuyerOrders = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const query = { buyer: buyerId };
        if (status && status !== 'all')
            query.status = status;
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('seller', 'firstName lastName shopName workshopName')
                .lean(),
            Order_1.default.countDocuments(query),
        ]);
        res.json({
            success: true,
            data: orders,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error('getBuyerOrders error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getBuyerOrders = getBuyerOrders;
// @desc    Cancel a buyer's order (only if pending)
// @route   PATCH /api/orders/my/:id/cancel
// @access  Private/Buyer
const cancelBuyerOrder = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { id } = req.params;
        const order = await Order_1.default.findOne({ _id: id, buyer: buyerId });
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (!CANCELLABLE_STATUSES.includes((0, orderStatus_1.normalizeOrderStatus)(order.status))) {
            res.status(400).json({ success: false, message: 'This order can no longer be cancelled' });
            return;
        }
        order.statusHistory.push({ status: order.status, changedAt: new Date(), note: 'Cancelled by buyer' });
        order.status = 'cancelled';
        await order.save();
        // Restore stock
        for (const item of order.items) {
            await Product_1.default.updateOne({ _id: item.product }, { $inc: { stock: item.qty, sales: -item.qty } });
        }
        const orderId = order._id.toString();
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(order.buyer),
            audience: 'buyer',
            orderId,
            status: 'cancelled',
            title: 'Order cancelled',
            message: 'Your order has been cancelled',
            actorRole: 'buyer',
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(order.seller),
            audience: 'seller',
            orderId,
            status: 'cancelled',
            title: 'Order cancelled by buyer',
            message: 'The buyer cancelled this order before pickup',
            actorRole: 'buyer',
        });
        res.json({ success: true, data: order });
    }
    catch (err) {
        console.error('cancelBuyerOrder error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.cancelBuyerOrder = cancelBuyerOrder;
// ─── Seller endpoints ───────────────────────────────────────────────────────
// @desc    Get order statistics for seller dashboard
// @route   GET /api/orders/stats
// @access  Private/Seller
const getOrderStats = async (req, res) => {
    try {
        const sellerId = req.user._id;
        // Current month boundaries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        // Run all aggregations in parallel
        const [totalStats, monthlyStats, lastMonthStats, recentOrders] = await Promise.all([
            // Overall totals
            Order_1.default.aggregate([
                { $match: { seller: new mongoose_1.default.Types.ObjectId(sellerId.toString()) } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0],
                            },
                        },
                        deliveredOrders: {
                            $sum: { $cond: [{ $in: ['$status', ['picked_up', 'out_for_delivery', 'delivered', 'completed']] }, 1, 0] },
                        },
                        cancelledOrders: {
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
                        },
                        pendingOrders: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch']] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        avgOrderValue: { $avg: '$totalAmount' },
                    },
                },
            ]),
            // This month stats
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: new mongoose_1.default.Types.ObjectId(sellerId.toString()),
                        createdAt: { $gte: startOfMonth },
                    },
                },
                {
                    $group: {
                        _id: null,
                        ordersThisMonth: { $sum: 1 },
                        revenueThisMonth: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0],
                            },
                        },
                    },
                },
            ]),
            // Last month stats (for comparison)
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: new mongoose_1.default.Types.ObjectId(sellerId.toString()),
                        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                    },
                },
                {
                    $group: {
                        _id: null,
                        ordersLastMonth: { $sum: 1 },
                        revenueLastMonth: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0],
                            },
                        },
                    },
                },
            ]),
            // Recent 5 orders needing action (pending / confirmed)
            Order_1.default.find({
                seller: sellerId,
                status: { $in: ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch'] },
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('_id status totalAmount createdAt')
                .lean(),
        ]);
        const total = totalStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            pendingOrders: 0,
            avgOrderValue: 0,
        };
        const monthly = monthlyStats[0] || { ordersThisMonth: 0, revenueThisMonth: 0 };
        const lastMonth = lastMonthStats[0] || { ordersLastMonth: 0, revenueLastMonth: 0 };
        // Growth percentages
        const orderGrowth = lastMonth.ordersLastMonth > 0
            ? Math.round(((monthly.ordersThisMonth - lastMonth.ordersLastMonth) / lastMonth.ordersLastMonth) * 100)
            : monthly.ordersThisMonth > 0
                ? 100
                : 0;
        const revenueGrowth = lastMonth.revenueLastMonth > 0
            ? Math.round(((monthly.revenueThisMonth - lastMonth.revenueLastMonth) / lastMonth.revenueLastMonth) * 100)
            : monthly.revenueThisMonth > 0
                ? 100
                : 0;
        const completionRate = total.totalOrders > 0
            ? Math.round((total.deliveredOrders / total.totalOrders) * 100)
            : 0;
        res.json({
            success: true,
            data: {
                totalOrders: total.totalOrders,
                totalRevenue: Math.round(total.totalRevenue),
                avgOrderValue: Math.round(total.avgOrderValue || 0),
                deliveredOrders: total.deliveredOrders,
                cancelledOrders: total.cancelledOrders,
                pendingOrders: total.pendingOrders,
                ordersThisMonth: monthly.ordersThisMonth,
                revenueThisMonth: Math.round(monthly.revenueThisMonth),
                orderGrowth,
                revenueGrowth,
                completionRate,
                recentActionNeeded: recentOrders,
            },
        });
    }
    catch (err) {
        console.error('getOrderStats error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getOrderStats = getOrderStats;
// @desc    Get seller's orders (paginated)
// @route   GET /api/orders/seller
// @access  Private/Seller
const getOrders = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const query = { seller: sellerId };
        if (status && status !== 'all')
            query.status = status;
        const [orders, total] = await Promise.all([
            Order_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('buyer', 'firstName lastName email phone address city postCode')
                .populate('items.product', 'type')
                .lean(),
            Order_1.default.countDocuments(query),
        ]);
        const ordersWithType = (orders || []).map((order) => {
            const firstItem = Array.isArray(order.items) ? order.items[0] : undefined;
            const productDoc = firstItem?.product;
            const inferredType = productDoc && typeof productDoc === 'object' && productDoc.type
                ? String(productDoc.type) === 'service'
                    ? 'service'
                    : 'product'
                : undefined;
            const normalizedItems = Array.isArray(order.items)
                ? order.items.map((item) => ({
                    ...item,
                    product: item.product && typeof item.product === 'object' && item.product._id
                        ? String(item.product._id)
                        : item.product,
                }))
                : [];
            return {
                ...order,
                items: normalizedItems,
                order_type: order.order_type || inferredType || 'product',
            };
        });
        res.json({
            success: true,
            data: ordersWithType,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error('getOrders error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getOrders = getOrders;
// @desc    Update order status with transition validation
// @route   PATCH /api/orders/seller/:id/status
// @access  Private/Seller
const updateOrderStatus = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { id } = req.params;
        const { status, note } = req.body;
        const targetStatus = (0, orderStatus_1.normalizeOrderStatus)(status);
        const order = await Order_1.default.findOne({ _id: id, seller: sellerId });
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        const currentStatus = (0, orderStatus_1.normalizeOrderStatus)(order.status);
        const allowedTransitions = orderStatus_1.ORDER_STATUS_FLOW[currentStatus] || [];
        if (req.user.role === 'seller' && !SELLER_PRE_PICKUP_TARGET_STATUSES.includes(targetStatus)) {
            res.status(400).json({
                success: false,
                message: 'Seller can only confirm, cancel, or mark an order as package ready before pickup',
            });
            return;
        }
        if (!allowedTransitions.includes(targetStatus)) {
            res.status(400).json({
                success: false,
                message: `Cannot transition from ${(0, orderStatus_1.getOrderStatusLabel)(currentStatus)} to ${(0, orderStatus_1.getOrderStatusLabel)(targetStatus)}`,
            });
            return;
        }
        order.statusHistory.push({
            status: order.status,
            changedAt: new Date(),
            note: note || `Status changed to ${(0, orderStatus_1.getOrderStatusLabel)(targetStatus)}`,
        });
        order.status = targetStatus;
        await order.save();
        const orderId = order._id.toString();
        const buyerUserId = order.buyer.toString();
        const sellerUserId = order.seller.toString();
        const buyerMessages = {
            confirmed: 'Your order has been confirmed',
            cancelled: 'Your order has been cancelled',
            ready_for_dispatch: 'Your package is ready',
        };
        const sellerMessages = {
            confirmed: 'Order confirmed successfully',
            cancelled: 'Order cancelled successfully',
            ready_for_dispatch: 'Package marked as ready',
        };
        if (buyerMessages[targetStatus]) {
            (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                userId: buyerUserId,
                audience: 'buyer',
                orderId,
                status: targetStatus,
                title: (0, orderStatus_1.getOrderStatusLabel)(targetStatus),
                message: buyerMessages[targetStatus],
                actorRole: 'seller',
            });
        }
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: sellerUserId,
            audience: 'seller',
            orderId,
            status: targetStatus,
            title: (0, orderStatus_1.getOrderStatusLabel)(targetStatus),
            message: sellerMessages[targetStatus] || `Order status updated to ${(0, orderStatus_1.getOrderStatusLabel)(targetStatus)}`,
            actorRole: 'seller',
        });
        res.json({ success: true, data: order });
    }
    catch (err) {
        console.error('updateOrderStatus error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// @desc    Buyer confirms the order was received
// @route   PATCH /api/orders/my/:id/confirm-received
// @access  Private/Buyer
const confirmOrderReceived = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { id } = req.params;
        const order = await Order_1.default.findOne({ _id: id, buyer: buyerId });
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        const currentStatus = (0, orderStatus_1.normalizeOrderStatus)(order.status);
        if (currentStatus !== 'delivered') {
            res.status(400).json({ success: false, message: 'Only delivered orders can be confirmed' });
            return;
        }
        order.statusHistory.push({
            status: order.status,
            changedAt: new Date(),
            note: 'Buyer confirmed receipt',
        });
        order.status = 'completed';
        await order.save();
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(order.seller),
            audience: 'seller',
            orderId: order._id.toString(),
            status: 'completed',
            title: 'Order completed',
            message: 'Buyer confirmed successful delivery',
            actorRole: 'buyer',
        });
        res.json({ success: true, data: order });
    }
    catch (err) {
        console.error('confirmOrderReceived error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.confirmOrderReceived = confirmOrderReceived;
