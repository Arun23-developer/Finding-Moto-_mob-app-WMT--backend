"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeliveryStatus = exports.getMyDeliveries = exports.getDeliveryByOrderId = exports.assignDelivery = exports.getDeliveryAgents = exports.getDeliveryDashboard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Delivery_1 = __importStar(require("../models/Delivery"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const orderStatus_1 = require("../utils/orderStatus");
const orderWorkflowEvents_1 = require("../utils/orderWorkflowEvents");
const DELIVERY_TRANSITIONS = {
    ASSIGNED: ['PICKED_UP'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED', 'FAILED'],
    DELIVERED: [],
    FAILED: [],
};
const formatDelivery = (delivery) => ({
    _id: delivery._id,
    orderId: delivery.orderId?._id || delivery.orderId,
    agentId: delivery.agentId?._id || delivery.agentId,
    status: delivery.status,
    statusHistory: delivery.statusHistory || [],
    deliveredAt: delivery.deliveredAt || null,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
});
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
const getDeliveryDashboard = async (req, res) => {
    try {
        const agentId = req.user._id;
        const range = req.query.range === 'weekly' ? 'weekly' : 'monthly';
        const { now, currentPeriodStart } = getPeriodBounds(range);
        const [totalDeliveries, completedDeliveriesCount, failedDeliveriesCount, activeDeliveries, deliveriesByDateAgg, recentDeliveries,] = await Promise.all([
            Delivery_1.default.countDocuments({ agentId }),
            Delivery_1.default.countDocuments({ agentId, status: 'DELIVERED' }),
            Delivery_1.default.countDocuments({ agentId, status: 'FAILED' }),
            Delivery_1.default.find({ agentId, status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } })
                .populate({
                path: 'orderId',
                select: 'items totalAmount shippingAddress status createdAt',
                populate: { path: 'buyer', select: 'firstName lastName phone' }
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Delivery_1.default.aggregate([
                {
                    $match: {
                        agentId,
                        createdAt: { $gte: currentPeriodStart, $lte: now },
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Delivery_1.default.find({ agentId })
                .populate({
                path: 'orderId',
                select: 'items totalAmount shippingAddress status createdAt',
                populate: { path: 'buyer', select: 'firstName lastName phone' }
            })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);
        // Volume Series Graph
        const periodLabels = getPeriodLabels(currentPeriodStart, now);
        const volumeMap = new Map(deliveriesByDateAgg.map((entry) => [entry._id, entry.count]));
        const realVolumeSeries = periodLabels.map((date) => ({
            date,
            count: volumeMap.get(date) ?? 0,
        }));
        const volumeSeries = realVolumeSeries;
        const successRate = totalDeliveries > 0 ? (completedDeliveriesCount / totalDeliveries) * 100 : 0;
        const kpis = {
            totalEarnings: 0,
            totalDeliveries,
            completedDeliveries: completedDeliveriesCount,
            activeDeliveries: activeDeliveries.length,
            successRate,
        };
        res.json({
            success: true,
            data: {
                filter: range,
                kpis,
                volumeSeries,
                activeDeliveries: activeDeliveries.map((d) => ({
                    _id: d._id,
                    orderId: d.orderId?._id,
                    customerName: `${d.orderId?.buyer?.firstName || ''} ${d.orderId?.buyer?.lastName || ''}`.trim() || 'Customer',
                    address: d.orderId?.shippingAddress || 'N/A',
                    amount: d.orderId?.totalAmount || 0,
                    status: d.status,
                    createdAt: d.createdAt,
                })),
                recentDeliveries: recentDeliveries.map((d) => ({
                    _id: d._id,
                    orderId: d.orderId?._id,
                    customerName: `${d.orderId?.buyer?.firstName || ''} ${d.orderId?.buyer?.lastName || ''}`.trim() || 'Customer',
                    address: d.orderId?.shippingAddress || 'N/A',
                    amount: d.orderId?.totalAmount || 0,
                    status: d.status,
                    createdAt: d.createdAt,
                    deliveredAt: d.deliveredAt,
                })),
            }
        });
    }
    catch (error) {
        console.error('getDeliveryDashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getDeliveryDashboard = getDeliveryDashboard;
const getDeliveryAgents = async (_req, res) => {
    try {
        const agents = await User_1.default.find({
            role: 'delivery_agent',
            approvalStatus: 'approved',
            agent_status: 'ENABLED',
            active_status: { $ne: 'DISABLED' },
            isActive: true,
            isEmailVerified: true,
        })
            .select('firstName lastName email phone')
            .sort({ createdAt: -1 })
            .lean();
        res.json({
            success: true,
            data: agents.map((agent) => ({
                _id: agent._id,
                firstName: agent.firstName,
                lastName: agent.lastName,
                fullName: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
                email: agent.email,
                phone: agent.phone || '',
            })),
        });
    }
    catch (error) {
        console.error('getDeliveryAgents error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getDeliveryAgents = getDeliveryAgents;
const assignDelivery = async (req, res) => {
    try {
        const { orderId: requestedOrderId, agentId } = req.body;
        if (!requestedOrderId || !agentId) {
            res.status(400).json({ success: false, message: 'Order ID and agent ID are required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(requestedOrderId) || !mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            res.status(400).json({ success: false, message: 'Invalid order or agent ID' });
            return;
        }
        const [order, agent, existingDelivery] = await Promise.all([
            Order_1.default.findById(requestedOrderId),
            User_1.default.findById(agentId).select('firstName lastName role approvalStatus agent_status active_status isActive isEmailVerified'),
            Delivery_1.default.findOne({ orderId: requestedOrderId }),
        ]);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (req.user.role !== 'admin' && order.seller.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to assign this order' });
            return;
        }
        if (!agent ||
            agent.role !== 'delivery_agent' ||
            agent.approvalStatus !== 'approved' ||
            agent.agent_status !== 'ENABLED' ||
            agent.active_status === 'DISABLED' ||
            !agent.isActive ||
            !agent.isEmailVerified) {
            res.status(400).json({ success: false, message: 'Invalid delivery agent' });
            return;
        }
        const currentOrderStatus = (0, orderStatus_1.normalizeOrderStatus)(order.status);
        if (currentOrderStatus !== 'ready_for_dispatch') {
            res.status(400).json({
                success: false,
                message: `Only orders marked as ${(0, orderStatus_1.getOrderStatusLabel)('ready_for_dispatch')} can be assigned for delivery`,
            });
            return;
        }
        if (existingDelivery) {
            res.status(400).json({ success: false, message: 'Delivery already assigned for this order' });
            return;
        }
        const delivery = await Delivery_1.default.create({
            orderId: order._id,
            agentId: agent._id,
            status: 'ASSIGNED',
            statusHistory: [{ status: 'ASSIGNED', changedAt: new Date() }],
        });
        order.statusHistory.push({
            status: order.status,
            changedAt: new Date(),
            note: `Assigned to delivery agent ${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
        });
        order.status = 'pickup_assigned';
        await order.save();
        const orderId = order._id.toString();
        const buyerUserId = order.buyer.toString();
        const sellerUserId = order.seller.toString();
        const agentUserId = agent._id.toString();
        const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Delivery agent';
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: buyerUserId,
            audience: 'buyer',
            orderId,
            status: 'pickup_assigned',
            title: 'Delivery agent assigned',
            message: 'A delivery agent has been assigned to your order',
            actorRole: 'seller',
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: sellerUserId,
            audience: 'seller',
            orderId,
            status: 'pickup_assigned',
            title: 'Delivery assigned',
            message: `${agentName} has been assigned for pickup`,
            actorRole: 'seller',
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: agentUserId,
            audience: 'delivery_agent',
            orderId,
            status: 'pickup_assigned',
            title: 'New Pickup Request',
            message: 'You have a new Pickup Request from Seller',
            actorRole: 'seller',
        });
        const populatedDelivery = await Delivery_1.default.findById(delivery._id)
            .populate('agentId', 'firstName lastName email phone')
            .populate('orderId', 'buyer seller items totalAmount status shippingAddress paymentMethod createdAt');
        res.status(201).json({
            success: true,
            data: formatDelivery(populatedDelivery),
        });
    }
    catch (error) {
        if (error?.code === 11000) {
            res.status(400).json({ success: false, message: 'Delivery already assigned for this order' });
            return;
        }
        console.error('assignDelivery error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.assignDelivery = assignDelivery;
const getDeliveryByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId || !mongoose_1.default.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ success: false, message: 'Invalid order id' });
            return;
        }
        const order = await Order_1.default.findById(orderId).select('seller');
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (req.user.role !== 'admin' && order.seller.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to view this delivery' });
            return;
        }
        const delivery = await Delivery_1.default.findOne({ orderId })
            .populate('agentId', 'firstName lastName email phone role')
            .lean();
        if (!delivery) {
            res.status(404).json({ success: false, message: 'Delivery not found' });
            return;
        }
        res.json({ success: true, data: formatDelivery(delivery) });
    }
    catch (error) {
        console.error('getDeliveryByOrderId error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getDeliveryByOrderId = getDeliveryByOrderId;
const getMyDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery_1.default.find({ agentId: req.user._id })
            .sort({ createdAt: -1 })
            .populate({
            path: 'orderId',
            select: 'buyer items totalAmount shippingAddress paymentMethod createdAt status',
            populate: {
                path: 'buyer',
                select: 'firstName lastName phone address',
            },
        })
            .lean();
        res.json({
            success: true,
            data: deliveries.map((delivery) => ({
                ...formatDelivery(delivery),
                order: delivery.orderId
                    ? {
                        _id: delivery.orderId._id,
                        items: delivery.orderId.items || [],
                        totalAmount: delivery.orderId.totalAmount,
                        status: delivery.orderId.status,
                        shippingAddress: delivery.orderId.shippingAddress,
                        paymentMethod: delivery.orderId.paymentMethod,
                        createdAt: delivery.orderId.createdAt,
                        buyer: delivery.orderId.buyer
                            ? {
                                firstName: delivery.orderId.buyer.firstName,
                                lastName: delivery.orderId.buyer.lastName,
                                phone: delivery.orderId.buyer.phone || '',
                                address: delivery.orderId.buyer.address || delivery.orderId.shippingAddress,
                            }
                            : null,
                    }
                    : null,
            })),
        });
    }
    catch (error) {
        console.error('getMyDeliveries error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMyDeliveries = getMyDeliveries;
const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Delivery_1.DELIVERY_STATUSES.includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid delivery status' });
            return;
        }
        const delivery = await Delivery_1.default.findOne({ _id: id, agentId: req.user._id });
        if (!delivery) {
            res.status(404).json({ success: false, message: 'Delivery not found' });
            return;
        }
        if (!DELIVERY_TRANSITIONS[delivery.status].includes(status)) {
            res.status(400).json({
                success: false,
                message: `Cannot transition from ${delivery.status} to ${status}`,
            });
            return;
        }
        delivery.statusHistory.push({ status, changedAt: new Date() });
        delivery.status = status;
        if (status === 'DELIVERED') {
            delivery.deliveredAt = new Date();
        }
        await delivery.save();
        const order = await Order_1.default.findById(delivery.orderId);
        if (order) {
            const currentOrderStatus = (0, orderStatus_1.normalizeOrderStatus)(order.status);
            const orderId = order._id.toString();
            const buyerUserId = order.buyer.toString();
            const sellerUserId = order.seller.toString();
            if (status === 'PICKED_UP' && currentOrderStatus !== 'picked_up') {
                order.statusHistory.push({ status: order.status, changedAt: new Date(), note: 'Collected by delivery agent' });
                order.status = 'picked_up';
                await order.save();
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: buyerUserId,
                    audience: 'buyer',
                    orderId,
                    status: 'picked_up',
                    title: 'Order picked up',
                    message: 'Your order has been picked up',
                    actorRole: 'delivery_agent',
                });
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: sellerUserId,
                    audience: 'seller',
                    orderId,
                    status: 'picked_up',
                    title: 'Order picked up',
                    message: 'Delivery agent has picked up the order',
                    actorRole: 'delivery_agent',
                });
            }
            else if (status === 'IN_TRANSIT' && (0, orderStatus_1.normalizeOrderStatus)(order.status) !== 'out_for_delivery') {
                order.statusHistory.push({ status: order.status, changedAt: new Date(), note: 'Out for delivery' });
                order.status = 'out_for_delivery';
                await order.save();
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: buyerUserId,
                    audience: 'buyer',
                    orderId,
                    status: 'out_for_delivery',
                    title: 'Out for delivery',
                    message: 'Your order is out for delivery',
                    actorRole: 'delivery_agent',
                });
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: sellerUserId,
                    audience: 'seller',
                    orderId,
                    status: 'out_for_delivery',
                    title: 'Out for delivery',
                    message: 'Order is out for delivery',
                    actorRole: 'delivery_agent',
                });
            }
            else if (status === 'DELIVERED' && (0, orderStatus_1.normalizeOrderStatus)(order.status) !== 'delivered') {
                order.statusHistory.push({ status: order.status, changedAt: new Date(), note: 'Delivered by assigned delivery agent' });
                order.status = 'delivered';
                await order.save();
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: buyerUserId,
                    audience: 'buyer',
                    orderId,
                    status: 'delivered',
                    title: 'Order delivered',
                    message: 'Your order has been successfully delivered',
                    actorRole: 'delivery_agent',
                });
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: sellerUserId,
                    audience: 'seller',
                    orderId,
                    status: 'delivered',
                    title: 'Order delivered',
                    message: 'Order delivered successfully',
                    actorRole: 'delivery_agent',
                });
            }
            else if (status === 'FAILED' && (0, orderStatus_1.normalizeOrderStatus)(order.status) !== 'delivery_failed') {
                order.statusHistory.push({ status: order.status, changedAt: new Date(), note: 'Delivery attempt failed' });
                order.status = 'delivery_failed';
                await order.save();
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: buyerUserId,
                    audience: 'buyer',
                    orderId,
                    status: 'delivery_failed',
                    title: 'Delivery failed',
                    message: 'Delivery attempt failed',
                    actorRole: 'delivery_agent',
                });
                (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
                    userId: sellerUserId,
                    audience: 'seller',
                    orderId,
                    status: 'delivery_failed',
                    title: 'Delivery failed',
                    message: 'Delivery attempt failed',
                    actorRole: 'delivery_agent',
                });
            }
        }
        res.json({
            success: true,
            data: formatDelivery(delivery),
        });
    }
    catch (error) {
        console.error('updateDeliveryStatus error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateDeliveryStatus = updateDeliveryStatus;
