"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = exports.getMechanicServices = exports.deleteService = exports.updateService = exports.createService = exports.getServices = exports.getMechanicReviews = exports.updateProfile = exports.getProfile = exports.getMechanicDashboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const Order_1 = __importDefault(require("../models/Order"));
const Review_1 = __importDefault(require("../models/Review"));
const Service_1 = __importDefault(require("../models/Service"));
const ServiceOrder_1 = __importDefault(require("../models/ServiceOrder"));
const orderStatus_1 = require("../utils/orderStatus");
const serviceOrderStatus_1 = require("../utils/serviceOrderStatus");
const LOW_STOCK_THRESHOLD = 5;
const REVENUE_STATUSES = ['completed'];
const SUCCESS_STATUSES = ['shipped', 'out_for_delivery', 'delivered', 'completed'];
const PENDING_STATUSES = ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch'];
const PRODUCT_RETURN_STATUSES = ['cancelled', 'refunded'];
const SERVICE_REVENUE_STATUSES = ['SERVICE_COMPLETED', 'PAYMENT_RECEIVED'];
const SERVICE_PENDING_STATUSES = ['SERVICE_ORDER_PLACED', 'SERVICE_ORDER_CONFIRMED', 'SERVICE_IN_PROGRESS'];
const SERVICE_PENDING_TABLE_STATUSES = ['SERVICE_ORDER_PLACED', 'SERVICE_ORDER_CONFIRMED'];
const toOptionalNumber = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    return Number(value);
};
const rejectNegativeNumber = (value, label, res, required = false) => {
    const numberValue = toOptionalNumber(value);
    if (numberValue === undefined) {
        if (required) {
            res.status(400).json({ success: false, message: `${label} is required.` });
            return true;
        }
        return false;
    }
    if (!Number.isFinite(numberValue)) {
        res.status(400).json({ success: false, message: `${label} must be a valid number.` });
        return true;
    }
    if (numberValue < 0) {
        res.status(400).json({ success: false, message: `${label} must be 0 or greater.` });
        return true;
    }
    return false;
};
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
const getBuyerName = (buyer) => `${buyer?.firstName || ''} ${buyer?.lastName || ''}`.trim() || buyer?.name || buyer?.email || 'Customer';
const buildProductDashboard = async (mechanicId, range) => {
    const { now, currentPeriodStart } = getPeriodBounds(range);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const revenueLabels = getPeriodLabels(currentPeriodStart, now);
    const products = await Product_1.default.find({ seller: mechanicId, type: 'product' })
        .select('_id name stock')
        .sort({ createdAt: -1 })
        .lean();
    const productIds = products.map((product) => product._id);
    const orderTypeMatchStages = [
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.product',
                foreignField: '_id',
                as: 'dashboardProduct',
            },
        },
        { $unwind: { path: '$dashboardProduct', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                resolvedOrderType: {
                    $ifNull: ['$order_type', '$dashboardProduct.type'],
                },
            },
        },
        {
            $match: {
                'dashboardProduct._id': { $in: productIds },
                resolvedOrderType: 'product',
            },
        },
    ];
    const [totalRevenueAgg, totalCompletedOrders, periodOrdersAgg, periodOrderDocs, pendingOrdersCount, pendingOrders, successfulOrdersCount, totalOrdersCount, currentMonthRevenueAgg, previousMonthRevenueAgg, revenueSeriesAgg, returnOrders, monthlyReviews, topSellingProductsAgg,] = await Promise.all([
        Order_1.default.aggregate([
            { $match: { seller: mechanicId, status: { $in: REVENUE_STATUSES } } },
            ...orderTypeMatchStages,
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order_1.default.countDocuments({ seller: mechanicId, status: { $in: REVENUE_STATUSES } }),
        Order_1.default.aggregate([
            { $match: { seller: mechanicId, status: { $in: REVENUE_STATUSES }, createdAt: { $gte: currentPeriodStart, $lte: now } } },
            ...orderTypeMatchStages,
            {
                $group: {
                    _id: null,
                    totalOrders: { $addToSet: '$_id' },
                    totalAmount: { $sum: '$totalAmount' },
                },
            },
            {
                $project: {
                    totalOrders: { $size: '$totalOrders' },
                    totalAmount: 1,
                },
            },
        ]),
        Order_1.default.find({
            seller: mechanicId,
            status: { $in: REVENUE_STATUSES },
            createdAt: { $gte: currentPeriodStart, $lte: now },
            order_type: 'product',
        })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName')
            .lean(),
        Order_1.default.aggregate([
            { $match: { seller: mechanicId, status: { $in: PENDING_STATUSES } } },
            ...orderTypeMatchStages,
            { $group: { _id: '$_id' } },
            { $count: 'total' },
        ]),
        Order_1.default.find({
            seller: mechanicId,
            order_type: 'product',
            status: { $in: PENDING_STATUSES },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('buyer', 'firstName lastName')
            .lean(),
        Order_1.default.countDocuments({ seller: mechanicId, status: { $in: SUCCESS_STATUSES } }),
        Order_1.default.countDocuments({ seller: mechanicId }),
        Order_1.default.aggregate([
            {
                $match: {
                    seller: mechanicId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            ...orderTypeMatchStages,
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order_1.default.aggregate([
            {
                $match: {
                    seller: mechanicId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
                },
            },
            ...orderTypeMatchStages,
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order_1.default.aggregate([
            {
                $match: {
                    seller: mechanicId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: currentPeriodStart, $lte: now },
                },
            },
            ...orderTypeMatchStages,
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Order_1.default.find({
            seller: mechanicId,
            order_type: 'product',
            status: { $in: PRODUCT_RETURN_STATUSES },
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
            .sort({ updatedAt: -1 })
            .limit(10)
            .populate('buyer', 'firstName lastName')
            .lean(),
        Review_1.default.find({
            productId: { $in: productIds },
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('buyer', 'firstName lastName')
            .populate('productId', 'name')
            .lean(),
        Order_1.default.aggregate([
            {
                $match: {
                    seller: mechanicId,
                    status: { $in: REVENUE_STATUSES },
                    createdAt: { $gte: currentPeriodStart, $lte: now },
                },
            },
            ...orderTypeMatchStages,
            {
                $group: {
                    _id: '$items.product',
                    itemName: { $first: '$items.name' },
                    unitsSold: { $sum: '$items.qty' },
                    revenueGenerated: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                },
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 10 },
        ]),
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
    const currentMonthRevenue = currentMonthRevenueAgg[0]?.total ?? 0;
    const previousMonthRevenue = previousMonthRevenueAgg[0]?.total ?? 0;
    const revenueGrowth = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : currentMonthRevenue > 0
            ? 100
            : 0;
    const totalOrdersCountVal = totalOrdersCount || 0;
    const successfulOrdersCountVal = successfulOrdersCount || 0;
    const completionRate = totalOrdersCountVal > 0 ? (successfulOrdersCountVal / totalOrdersCountVal) * 100 : 0;
    const kpis = {
        totalRevenue,
        ordersThisMonth: periodOrdersAgg[0]?.totalOrders || 0,
        ordersThisMonthAmount: periodOrdersAgg[0]?.totalAmount || 0,
        pendingOrders: pendingOrdersCount[0]?.total || 0,
        avgOrderValue: totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0,
        completionRate,
        revenueGrowth,
    };
    const revenueMap = new Map(revenueSeriesAgg.map((entry) => [entry._id, entry.revenue]));
    const revenueSeries = revenueLabels.map((date) => ({ date, revenue: revenueMap.get(date) ?? 0 }));
    const lowStockAlerts = products
        .filter((p) => (p.stock || 0) < LOW_STOCK_THRESHOLD)
        .map((p) => ({
        itemName: p.name,
        currentQuantity: p.stock || 0,
        minimumRequiredQuantity: LOW_STOCK_THRESHOLD,
    }));
    return {
        success: true,
        data: {
            type: 'product',
            hasData: true,
            kpis,
            revenueSeries,
            ordersThisMonth: periodOrderDocs.map((o) => ({
                orderId: o._id,
                customerName: getBuyerName(o.buyer),
                itemName: o.items?.[0]?.name || 'Item',
                orderAmount: o.totalAmount,
                orderDate: o.createdAt,
                orderStatus: (0, orderStatus_1.getOrderStatusLabel)(o.status),
            })),
            pendingOrders: pendingOrders.map((o) => ({
                orderId: o._id,
                customerName: getBuyerName(o.buyer),
                itemName: o.items?.[0]?.name || 'Item',
                orderAmount: o.totalAmount,
                orderDate: o.createdAt,
                orderStatus: (0, orderStatus_1.getOrderStatusLabel)(o.status),
            })),
            returnOrders: returnOrders.map((o) => ({
                orderId: o._id,
                customerName: getBuyerName(o.buyer),
                itemName: o.items?.[0]?.name || 'Item',
                amount: o.totalAmount,
                actionDate: o.updatedAt,
            })),
            monthlyReviews: monthlyReviews.map((r) => ({
                reviewId: r._id,
                customerName: getBuyerName(r.buyer),
                itemName: r.productId?.name || 'Product',
                rating: r.rating,
                review: r.comment,
                reviewDate: r.createdAt,
            })),
            lowStockAlerts,
            topSellingItems: topSellingProductsAgg.map((p) => ({
                itemId: p._id,
                itemName: p.itemName,
                unitsSold: p.unitsSold,
                revenueGenerated: p.revenueGenerated,
            })),
        },
    };
};
const buildServiceDashboard = async (mechanicId, range) => {
    const { now, currentPeriodStart } = getPeriodBounds(range);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const revenueLabels = getPeriodLabels(currentPeriodStart, now);
    const services = await Service_1.default.find({ mechanic: mechanicId }).select('_id name').lean();
    const serviceIds = services.map((s) => s._id);
    const [totalRevenueAgg, totalCompletedOrdersCount, periodOrdersAgg, periodOrderDocs, pendingOrdersCount, pendingOrdersDocs, successfulOrdersCount, totalOrdersCount, currentMonthRevenueAgg, previousMonthRevenueAgg, revenueSeriesAgg, monthlyReviews, topPerformingServicesAgg,] = await Promise.all([
        ServiceOrder_1.default.aggregate([
            { $match: { mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES } } },
            { $group: { _id: null, total: { $sum: '$servicePrice' } } },
        ]),
        ServiceOrder_1.default.countDocuments({ mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES } }),
        ServiceOrder_1.default.aggregate([
            { $match: { mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES }, createdAt: { $gte: currentPeriodStart, $lte: now } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$servicePrice' },
                },
            },
        ]),
        ServiceOrder_1.default.find({
            mechanic: mechanicId,
            status: { $in: SERVICE_REVENUE_STATUSES },
            createdAt: { $gte: currentPeriodStart, $lte: now },
        })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName')
            .lean(),
        ServiceOrder_1.default.countDocuments({ mechanic: mechanicId, status: { $in: SERVICE_PENDING_STATUSES } }),
        ServiceOrder_1.default.find({
            mechanic: mechanicId,
            status: { $in: SERVICE_PENDING_STATUSES },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('buyer', 'firstName lastName')
            .lean(),
        ServiceOrder_1.default.countDocuments({ mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES } }),
        ServiceOrder_1.default.countDocuments({ mechanic: mechanicId }),
        ServiceOrder_1.default.aggregate([
            {
                $match: {
                    mechanic: mechanicId,
                    status: { $in: SERVICE_REVENUE_STATUSES },
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            { $group: { _id: null, total: { $sum: '$servicePrice' } } },
        ]),
        ServiceOrder_1.default.aggregate([
            {
                $match: {
                    mechanic: mechanicId,
                    status: { $in: SERVICE_REVENUE_STATUSES },
                    createdAt: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth },
                },
            },
            { $group: { _id: null, total: { $sum: '$servicePrice' } } },
        ]),
        ServiceOrder_1.default.aggregate([
            {
                $match: {
                    mechanic: mechanicId,
                    status: { $in: SERVICE_REVENUE_STATUSES },
                    createdAt: { $gte: currentPeriodStart, $lte: now },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$servicePrice' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Review_1.default.find({
            serviceId: { $in: serviceIds },
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('buyer', 'firstName lastName')
            .populate({
            path: 'productId', // Using productId as placeholder if serviceId refs are handled through productId in model or check if serviceId exists
            select: 'name'
        })
            .lean(),
        ServiceOrder_1.default.aggregate([
            {
                $match: {
                    mechanic: mechanicId,
                    status: { $in: SERVICE_REVENUE_STATUSES },
                    createdAt: { $gte: currentPeriodStart, $lte: now },
                },
            },
            {
                $group: {
                    _id: '$serviceName',
                    unitsSold: { $sum: 1 },
                    revenueGenerated: { $sum: '$servicePrice' },
                },
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 10 },
        ]),
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
    const currentMonthRevenue = currentMonthRevenueAgg[0]?.total ?? 0;
    const previousMonthRevenue = previousMonthRevenueAgg[0]?.total ?? 0;
    const revenueGrowth = previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : currentMonthRevenue > 0
            ? 100
            : 0;
    const totalOrdersCountVal = totalOrdersCount || 0;
    const successfulOrdersCountVal = successfulOrdersCount || 0;
    const completionRate = totalOrdersCountVal > 0 ? (successfulOrdersCountVal / totalOrdersCountVal) * 100 : 0;
    const kpis = {
        totalRevenue,
        ordersThisMonth: periodOrdersAgg[0]?.totalOrders || 0,
        ordersThisMonthAmount: periodOrdersAgg[0]?.totalAmount || 0,
        pendingOrders: pendingOrdersCount || 0,
        avgOrderValue: totalCompletedOrdersCount > 0 ? totalRevenue / totalCompletedOrdersCount : 0,
        completionRate,
        revenueGrowth,
    };
    const revenueMap = new Map(revenueSeriesAgg.map((entry) => [entry._id, entry.revenue]));
    const revenueSeries = revenueLabels.map((date) => ({ date, revenue: revenueMap.get(date) ?? 0 }));
    return {
        success: true,
        data: {
            type: 'service',
            hasData: true,
            kpis,
            revenueSeries,
            ordersThisMonth: periodOrderDocs.map((o) => ({
                orderId: o._id,
                customerName: getBuyerName(o.buyer),
                itemName: o.serviceName,
                orderAmount: o.servicePrice,
                orderDate: o.createdAt,
                orderStatus: (0, serviceOrderStatus_1.getServiceOrderStatusLabel)(o.status),
            })),
            pendingOrders: pendingOrdersDocs.map((o) => ({
                orderId: o._id,
                customerName: getBuyerName(o.buyer),
                itemName: o.serviceName,
                orderAmount: o.servicePrice,
                orderDate: o.createdAt,
                orderStatus: (0, serviceOrderStatus_1.getServiceOrderStatusLabel)(o.status),
            })),
            returnOrders: [],
            monthlyReviews: monthlyReviews.map((r) => ({
                reviewId: r._id,
                customerName: getBuyerName(r.buyer),
                itemName: r.productId?.name || 'Service',
                rating: r.rating,
                review: r.comment,
                reviewDate: r.createdAt,
            })),
            lowStockAlerts: [],
            topSellingItems: topPerformingServicesAgg.map((p) => ({
                itemId: p._id,
                itemName: p._id,
                unitsSold: p.unitsSold,
                revenueGenerated: p.revenueGenerated,
            })),
        },
    };
};
const getMechanicDashboard = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const type = req.query.type === 'service' ? 'service' : 'product';
        const range = req.query.range === 'weekly' ? 'weekly' : 'monthly';
        const payload = type === 'service'
            ? await buildServiceDashboard(mechanicId, range)
            : await buildProductDashboard(mechanicId, range);
        res.json(payload);
    }
    catch (err) {
        console.error('getMechanicDashboard error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMechanicDashboard = getMechanicDashboard;
const getProfile = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const user = await User_1.default.findById(mechanicId).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const { firstName, lastName, phone, address } = req.body;
        const user = await User_1.default.findByIdAndUpdate(mechanicId, { firstName, lastName, phone, address }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
const getMechanicReviews = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const [products, services] = await Promise.all([
            Product_1.default.find({ seller: mechanicId, type: 'product' }).select('_id name').lean(),
            Service_1.default.find({ mechanic: mechanicId }).select('_id name').lean(),
        ]);
        const productIds = products.map((product) => product._id);
        const productMap = new Map(products.map((product) => [product._id.toString(), product.name]));
        const [productReviews, mechanicReviews] = await Promise.all([
            productIds.length > 0
                ? Review_1.default.find({ productId: { $in: productIds } })
                    .sort({ createdAt: -1 })
                    .populate('buyer', 'firstName lastName')
                    .lean()
                : [],
            Review_1.default.find({ mechanicId })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('buyer', 'firstName lastName')
                .lean(),
        ]);
        const reviews = [...productReviews, ...mechanicReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const total = reviews.length;
        const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
        const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
        const productRatings = products.map((product) => {
            const productReviewSet = productReviews.filter((review) => review.productId?.toString() === product._id.toString());
            const reviewCount = productReviewSet.length;
            const averageRating = reviewCount > 0
                ? Math.round((productReviewSet.reduce((acc, review) => acc + (review.rating || 0), 0) / reviewCount) * 10) / 10
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
        const serviceReviewCount = mechanicReviews.length;
        const serviceAverageRating = serviceReviewCount > 0
            ? Math.round((mechanicReviews.reduce((acc, review) => acc + (review.rating || 0), 0) / serviceReviewCount) * 10) / 10
            : 0;
        const serviceRatings = services.map((service) => ({
            serviceId: service._id,
            serviceName: service.name,
            averageRating: serviceAverageRating,
            totalReviewCount: serviceReviewCount,
        }));
        const getBuyerName = (buyer) => `${buyer?.firstName || ''} ${buyer?.lastName || ''}`.trim() || 'Customer';
        const customerReviews = reviews.slice(0, 50).map((review) => {
            const isProductReview = Boolean(review.productId);
            return {
                _id: review._id,
                itemType: isProductReview ? 'product' : 'service',
                itemName: isProductReview
                    ? productMap.get(review.productId?.toString()) || 'Unknown Product'
                    : 'Workshop Service',
                customerName: getBuyerName(review.buyer),
                rating: review.rating || 0,
                comment: review.comment || '',
                reviewDate: review.createdAt,
            };
        });
        res.json({
            success: true,
            data: {
                stats: { average, total },
                productRatings,
                serviceRatings,
                customerReviews,
            },
        });
    }
    catch (err) {
        console.error('getMechanicReviews error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMechanicReviews = getMechanicReviews;
const getServices = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const services = await Service_1.default.find({ mechanic: mechanicId }).sort({ createdAt: -1 });
        res.json({ success: true, data: services });
    }
    catch (err) {
        console.error('getServices error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getServices = getServices;
const createService = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        if (rejectNegativeNumber(req.body.price, 'Service price', res, true))
            return;
        if (rejectNegativeNumber(req.body.originalPrice, 'Original price', res))
            return;
        const service = await Service_1.default.create({ ...req.body, mechanic: mechanicId });
        res.status(201).json({ success: true, data: service });
    }
    catch (err) {
        console.error('createService error:', err);
        if (err?.name === 'ValidationError') {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createService = createService;
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.price !== undefined && rejectNegativeNumber(req.body.price, 'Service price', res))
            return;
        if (req.body.originalPrice !== undefined && rejectNegativeNumber(req.body.originalPrice, 'Original price', res))
            return;
        const service = await Service_1.default.findOneAndUpdate({ _id: id, mechanic: req.user._id }, req.body, { new: true, runValidators: true });
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.json({ success: true, data: service });
    }
    catch (err) {
        console.error('updateService error:', err);
        if (err?.name === 'ValidationError') {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateService = updateService;
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service_1.default.findOneAndDelete({ _id: id, mechanic: req.user._id });
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found' });
            return;
        }
        res.json({ success: true, message: 'Service deleted' });
    }
    catch (err) {
        console.error('deleteService error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteService = deleteService;
const getMechanicServices = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const services = await Service_1.default.find({ mechanic: mechanicId }).sort({ createdAt: -1 });
        res.json({ success: true, data: services });
    }
    catch (err) {
        console.error('getMechanicServices error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMechanicServices = getMechanicServices;
const getOverview = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const [totalServices, activeServices, totalBookings, pendingBookings, completedBookings, revenueResult,] = await Promise.all([
            Service_1.default.countDocuments({ mechanic: mechanicId }),
            Service_1.default.countDocuments({ mechanic: mechanicId, active: true }),
            ServiceOrder_1.default.countDocuments({ mechanic: mechanicId }),
            ServiceOrder_1.default.countDocuments({ mechanic: mechanicId, status: { $in: SERVICE_PENDING_STATUSES } }),
            ServiceOrder_1.default.countDocuments({ mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES } }),
            ServiceOrder_1.default.aggregate([
                { $match: { mechanic: mechanicId, status: { $in: SERVICE_REVENUE_STATUSES } } },
                { $group: { _id: null, total: { $sum: '$servicePrice' } } },
            ]),
        ]);
        const revenue = revenueResult[0]?.total ?? 0;
        const recentBookings = await ServiceOrder_1.default.find({ mechanic: mechanicId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('buyer', 'firstName lastName email')
            .lean();
        res.json({
            success: true,
            data: {
                stats: {
                    revenue,
                    totalBookings,
                    pendingBookings,
                    completedBookings,
                    totalServices,
                    activeServices,
                },
                recentBookings,
            },
        });
    }
    catch (err) {
        console.error('getOverview error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getOverview = getOverview;
