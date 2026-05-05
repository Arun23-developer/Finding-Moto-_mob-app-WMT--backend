"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerReviews = exports.updateProfile = exports.getProfile = exports.getAnalytics = exports.getOverview = exports.getSellerDashboard = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Order_1 = __importDefault(require("../models/Order"));
const Review_1 = __importDefault(require("../models/Review"));
const orderStatus_1 = require("../utils/orderStatus");
const LOW_STOCK_THRESHOLD = 5;
const REVENUE_STATUSES = ['completed'];
const SUCCESS_STATUSES = ['shipped', 'out_for_delivery', 'delivered', 'completed'];
const PENDING_STATUSES = ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch'];
const getPeriodBounds = (range) => {
    const now = new Date();
    const currentPeriodStart = range === 'weekly'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    return { now, currentPeriodStart };
};
const getPeriodLabels = (start, end) => {
    const labels = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const finalDate = new Date(end);
    finalDate.setHours(23, 59, 59, 999);
    const iter = new Date(cursor);
    while (iter <= finalDate) {
        labels.push(iter.toISOString().slice(0, 10));
        iter.setDate(iter.getDate() + 1);
    }
    return labels;
};
const getSellerDashboard = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const range = req.query.range === 'weekly' ? 'weekly' : 'monthly';
        const { now, currentPeriodStart } = getPeriodBounds(range);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const revenuePeriodStart = currentPeriodStart;
        const revenuePeriodEnd = now;
        const [totalCompletedRevenueAgg, totalCompletedOrders, periodOrdersAgg, periodOrderDocs, pendingOrdersCount, pendingOrders, shippedOrdersCount, totalOrdersCount, currentMonthRevenueAgg, previousMonthRevenueAgg, revenueSeriesAgg, returnOrders, monthlyReviews, lowStockProducts, topSellingProductsAgg,] = await Promise.all([
            Order_1.default.aggregate([
                { $match: { seller: sellerId, order_type: 'product', status: { $in: REVENUE_STATUSES } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Order_1.default.countDocuments({ seller: sellerId, order_type: 'product', status: { $in: REVENUE_STATUSES } }),
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        order_type: 'product',
                        status: { $in: REVENUE_STATUSES },
                        createdAt: { $gte: currentPeriodStart, $lte: now },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                    },
                },
            ]),
            Order_1.default.find({
                seller: sellerId,
                order_type: 'product',
                status: { $in: REVENUE_STATUSES },
                createdAt: { $gte: currentPeriodStart, $lte: now },
            })
                .sort({ createdAt: -1 })
                .populate('buyer', 'firstName lastName')
                .lean(),
            Order_1.default.countDocuments({ seller: sellerId, status: { $in: PENDING_STATUSES } }),
            Order_1.default.find({ seller: sellerId, status: { $in: PENDING_STATUSES } })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('buyer', 'firstName lastName')
                .lean(),
            Order_1.default.countDocuments({ seller: sellerId, status: { $in: SUCCESS_STATUSES } }),
            Order_1.default.countDocuments({ seller: sellerId }),
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        order_type: 'product',
                        status: { $in: REVENUE_STATUSES },
                        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        order_type: 'product',
                        status: { $in: REVENUE_STATUSES },
                        createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        order_type: 'product',
                        status: { $in: REVENUE_STATUSES },
                        createdAt: { $gte: revenuePeriodStart, $lte: revenuePeriodEnd },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Order_1.default.find({
                seller: sellerId,
                status: { $in: ['cancelled', 'refunded'] },
                updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
            })
                .sort({ updatedAt: -1 })
                .limit(10)
                .populate('buyer', 'firstName lastName')
                .lean(),
            Review_1.default.find({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            })
                .populate({
                path: 'productId',
                select: 'name seller',
                match: { seller: sellerId },
            })
                .populate('buyer', 'firstName lastName')
                .sort({ createdAt: -1 })
                .lean(),
            Product_1.default.find({
                seller: sellerId,
                type: 'product',
                stock: { $lt: LOW_STOCK_THRESHOLD },
            })
                .select('name stock')
                .sort({ stock: 1, name: 1 })
                .lean(),
            Order_1.default.aggregate([
                {
                    $match: {
                        seller: sellerId,
                        order_type: 'product',
                        status: { $in: REVENUE_STATUSES },
                        createdAt: { $gte: currentPeriodStart, $lte: now },
                    },
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        productName: { $first: '$items.name' },
                        unitsSold: { $sum: '$items.qty' },
                        revenueGenerated: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    },
                },
                { $sort: { unitsSold: -1, revenueGenerated: -1 } },
                { $limit: 10 },
            ]),
        ]);
        const totalCompletedRevenue = totalCompletedRevenueAgg[0]?.total ?? 0;
        const periodOrdersSummary = periodOrdersAgg[0] ?? { totalOrders: 0, totalAmount: 0 };
        const currentMonthRevenue = currentMonthRevenueAgg[0]?.total ?? 0;
        const previousMonthRevenue = previousMonthRevenueAgg[0]?.total ?? 0;
        const revenueGrowth = previousMonthRevenue > 0
            ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
            : currentMonthRevenue > 0
                ? 100
                : 0;
        const completionRate = totalOrdersCount > 0 ? (shippedOrdersCount / totalOrdersCount) * 100 : 0;
        const avgOrderValue = totalCompletedOrders > 0 ? totalCompletedRevenue / totalCompletedOrders : 0;
        // Revenue Series Graph
        const periodLabels = getPeriodLabels(revenuePeriodStart, revenuePeriodEnd);
        const revenueMap = new Map(revenueSeriesAgg.map((entry) => [entry._id, entry.revenue]));
        const realRevenueSeries = periodLabels.map((date) => ({
            date,
            revenue: revenueMap.get(date) ?? 0,
        }));
        const revenueSeries = realRevenueSeries;
        const monthlyOrderRows = periodOrderDocs.map((order) => ({
            orderId: order._id,
            customerName: `${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim() || 'Customer',
            productName: order.items?.[0]?.name || 'Item',
            orderAmount: order.totalAmount || 0,
            orderDate: order.createdAt,
            orderStatus: (0, orderStatus_1.getOrderStatusLabel)(order.status),
        }));
        const pendingOrderRows = pendingOrders.map((order) => ({
            orderId: order._id,
            customerName: `${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim() || 'Customer',
            productName: order.items?.[0]?.name || 'Item',
            orderAmount: order.totalAmount || 0,
            orderDate: order.createdAt,
            orderStatus: (0, orderStatus_1.getOrderStatusLabel)(order.status),
        }));
        const returnOrderRows = returnOrders.map((order) => {
            const returnedStatus = Array.isArray(order.statusHistory)
                ? [...order.statusHistory].reverse().find((statusItem) => ['cancelled', 'refunded'].includes(statusItem.status))
                : null;
            return {
                orderId: order._id,
                productName: order.items?.[0]?.name || 'Item',
                customerName: `${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim() || 'Customer',
                returnReason: order.notes || returnedStatus?.note || 'Returned or refunded order',
                returnDate: returnedStatus?.changedAt || order.updatedAt,
                refundAmount: order.totalAmount || 0,
            };
        });
        const monthlyReviewRows = monthlyReviews
            .filter((review) => review.productId)
            .map((review) => ({
            customerName: `${review.buyer?.firstName || ''} ${review.buyer?.lastName || ''}`.trim() || 'Customer',
            productName: review.productId?.name || 'Product',
            rating: review.rating,
            review: review.comment,
            reviewDate: review.createdAt,
        }));
        const lowStockRows = lowStockProducts.map((product) => ({
            productName: product.name,
            currentQuantity: product.stock,
            minimumRequiredQuantity: LOW_STOCK_THRESHOLD,
        }));
        const topSellingRows = topSellingProductsAgg.map((product) => ({
            productId: product._id,
            productName: product.productName || 'Product',
            unitsSold: product.unitsSold || 0,
            revenueGenerated: product.revenueGenerated || 0,
        }));
        const finalKpis = {
            totalRevenue: totalCompletedRevenue,
            ordersThisMonth: periodOrdersSummary.totalOrders,
            ordersThisMonthAmount: periodOrdersSummary.totalAmount,
            pendingOrders: pendingOrdersCount,
            avgOrderValue,
            completionRate,
            revenueGrowth,
        };
        res.json({
            success: true,
            data: {
                filter: range,
                kpis: finalKpis,
                revenueSeries,
                ordersThisMonth: monthlyOrderRows,
                pendingOrders: pendingOrderRows,
                returnOrders: returnOrderRows,
                monthlyReviews: monthlyReviewRows,
                lowStockAlerts: lowStockRows,
                topSellingProducts: topSellingRows,
            },
        });
    }
    catch (err) {
        console.error('getSellerDashboard error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getSellerDashboard = getSellerDashboard;
const getOverview = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const [totalProducts, activeProducts, totalOrders, pendingOrders, deliveredOrders, revenueResult, viewsResult,] = await Promise.all([
            Product_1.default.countDocuments({ seller: sellerId }),
            Product_1.default.countDocuments({ seller: sellerId, status: 'active' }),
            Order_1.default.countDocuments({ seller: sellerId }),
            Order_1.default.countDocuments({ seller: sellerId, status: { $in: PENDING_STATUSES } }),
            Order_1.default.countDocuments({ seller: sellerId, order_type: 'product', status: { $in: REVENUE_STATUSES } }),
            Order_1.default.aggregate([
                { $match: { seller: sellerId, order_type: 'product', status: { $in: REVENUE_STATUSES } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Product_1.default.aggregate([
                { $match: { seller: sellerId } },
                { $group: { _id: null, total: { $sum: '$views' } } },
            ]),
        ]);
        const revenue = revenueResult[0]?.total ?? 0;
        const totalViews = viewsResult[0]?.total ?? 0;
        // Recent orders (last 5)
        const recentOrders = await Order_1.default.find({ seller: sellerId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('buyer', 'firstName lastName email')
            .lean();
        // Top products by sales
        const topProducts = await Product_1.default.find({ seller: sellerId })
            .sort({ sales: -1 })
            .limit(5)
            .lean();
        res.json({
            success: true,
            data: {
                stats: {
                    revenue,
                    totalOrders,
                    pendingOrders,
                    deliveredOrders,
                    totalProducts,
                    activeProducts,
                    totalViews,
                },
                recentOrders,
                topProducts,
            },
        });
    }
    catch (err) {
        console.error('getOverview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getOverview = getOverview;
const getAnalytics = async (req, res) => {
    try {
        const sellerId = req.user._id;
        // Last 7 days daily revenue
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dailyRevenue = await Order_1.default.aggregate([
            {
                $match: {
                    seller: sellerId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: sevenDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Last 30 days monthly revenue
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyRevenue = await Order_1.default.aggregate([
            {
                $match: {
                    seller: sellerId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Orders by status
        const ordersByStatus = await Order_1.default.aggregate([
            { $match: { seller: sellerId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        // Top categories by revenue
        const topCategories = await Order_1.default.aggregate([
            { $match: { seller: sellerId, order_type: 'product', status: { $in: REVENUE_STATUSES } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo',
                },
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$productInfo.category',
                    revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    unitsSold: { $sum: '$items.qty' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
        ]);
        res.json({
            success: true,
            data: { dailyRevenue, monthlyRevenue, ordersByStatus, topCategories },
        });
    }
    catch (err) {
        console.error('getAnalytics error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getAnalytics = getAnalytics;
const getProfile = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.fullName,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatar: user.avatar,
                phone: user.phone,
                shopName: user.shopName,
                shopDescription: user.shopDescription,
                shopLocation: user.shopLocation,
                sellerSpecializations: user.sellerSpecializations,
                sellerBrands: user.sellerBrands,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    }
    catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const { name, firstName, lastName, phone, shopName, shopDescription, shopLocation, sellerSpecializations, sellerBrands } = req.body;
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        // Support legacy 'name' field: split into firstName/lastName
        if (name && !firstName && !lastName) {
            const parts = name.trim().split(/\s+/);
            user.firstName = parts[0];
            user.lastName = parts.slice(1).join(' ') || '';
        }
        const userRecord = user;
        if (phone !== undefined)
            userRecord.phone = phone;
        if (shopName !== undefined)
            userRecord.shopName = shopName;
        if (shopDescription !== undefined)
            userRecord.shopDescription = shopDescription;
        if (shopLocation !== undefined)
            userRecord.shopLocation = shopLocation;
        if (sellerSpecializations !== undefined)
            userRecord.sellerSpecializations = Array.isArray(sellerSpecializations) ? sellerSpecializations : [];
        if (sellerBrands !== undefined)
            userRecord.sellerBrands = Array.isArray(sellerBrands) ? sellerBrands : [];
        await user.save();
        res.json({ success: true, data: user });
    }
    catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
const getSellerReviews = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const products = await Product_1.default.find({ seller: sellerId, type: 'product' }).select('_id name').lean();
        const productIds = products.map((p) => p._id);
        const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));
        const reviews = await Review_1.default.find({ productId: { $in: productIds } })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName')
            .lean();
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
        const productRatings = products.map((product) => {
            const productReviewSet = reviews.filter((review) => review.productId?.toString() === product._id.toString());
            const reviewCount = productReviewSet.length;
            const averageRating = reviewCount > 0
                ? Math.round((productReviewSet.reduce((acc, review) => acc + review.rating, 0) / reviewCount) * 10) / 10
                : 0;
            return {
                productId: product._id,
                productName: product.name,
                averageRating,
                totalReviewCount: reviewCount,
            };
        }).sort((a, b) => {
            if (b.totalReviewCount !== a.totalReviewCount)
                return b.totalReviewCount - a.totalReviewCount;
            return b.averageRating - a.averageRating;
        });
        const customerReviews = reviews.map((review) => {
            const buyer = review.buyer;
            return {
                _id: review._id,
                productId: review.productId,
                productName: review.productId ? productMap.get(review.productId.toString()) || 'Unknown Product' : 'Unknown Product',
                customerName: buyer ? `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Customer' : 'Customer',
                rating: review.rating,
                comment: review.comment,
                reviewDate: review.createdAt,
            };
        });
        res.json({
            success: true,
            data: {
                stats: { average, total },
                productRatings,
                customerReviews,
            },
        });
    }
    catch (err) {
        console.error('getSellerReviews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getSellerReviews = getSellerReviews;
