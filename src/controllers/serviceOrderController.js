"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServiceOrderStatus = exports.getMechanicServiceOrders = exports.getBuyerServiceOrders = exports.createServiceOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Service_1 = __importDefault(require("../models/Service"));
const ServiceOrder_1 = __importDefault(require("../models/ServiceOrder"));
const serviceOrderStatus_1 = require("../utils/serviceOrderStatus");
const orderWorkflowEvents_1 = require("../utils/orderWorkflowEvents");
const isMechanicRole = (role) => role === 'mechanic';
const isBuyerRole = (role) => role === 'buyer';
const getOrderAudience = (role) => {
    if (isBuyerRole(role))
        return 'buyer';
    return 'seller';
};
const getMechanicDisplayName = (mechanic) => {
    if (!mechanic)
        return 'Mechanic';
    return mechanic.workshopName || `${mechanic.firstName || ''} ${mechanic.lastName || ''}`.trim() || 'Mechanic';
};
const createServiceOrder = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { serviceId, bookingDate, notes } = req.body;
        if (!serviceId || !bookingDate) {
            res.status(400).json({ success: false, message: 'Service ID and booking date/time are required' });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(serviceId)) {
            res.status(400).json({ success: false, message: 'Invalid service ID' });
            return;
        }
        const bookingTimestamp = new Date(bookingDate);
        if (Number.isNaN(bookingTimestamp.getTime())) {
            res.status(400).json({ success: false, message: 'Invalid booking date/time' });
            return;
        }
        const service = await Service_1.default.findOne({ _id: serviceId, active: true, productStatus: 'ENABLED' });
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found or unavailable' });
            return;
        }
        const placedAt = new Date();
        const order = await ServiceOrder_1.default.create({
            buyer: buyerId,
            mechanic: service.mechanic,
            service: service._id,
            serviceName: service.name,
            servicePrice: service.price,
            bookingDate: bookingTimestamp,
            notes: notes || '',
            status: 'SERVICE_ORDER_PLACED',
            statusHistory: [
                { status: 'SERVICE_ORDER_PLACED', changedAt: placedAt, note: 'Service booking requested' },
            ],
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(buyerId),
            audience: 'buyer',
            orderId: order._id.toString(),
            status: 'SERVICE_ORDER_PLACED',
            title: 'Service booking requested',
            message: `Your booking for ${service.name} has been created and is pending mechanic confirmation.`,
            actorRole: 'buyer',
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: String(service.mechanic),
            audience: 'seller',
            orderId: order._id.toString(),
            status: 'SERVICE_ORDER_PLACED',
            title: 'New service booking',
            message: `A new booking request for ${service.name} has been placed.`,
            actorRole: 'buyer',
        });
        res.status(201).json({ success: true, data: order });
    }
    catch (err) {
        console.error('createServiceOrder error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createServiceOrder = createServiceOrder;
const getBuyerServiceOrders = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const orders = await ServiceOrder_1.default.find({ buyer: buyerId })
            .sort({ createdAt: -1 })
            .populate('mechanic', 'firstName lastName workshopName email phone')
            .lean();
        res.json({ success: true, data: orders });
    }
    catch (err) {
        console.error('getBuyerServiceOrders error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getBuyerServiceOrders = getBuyerServiceOrders;
const getMechanicServiceOrders = async (req, res) => {
    try {
        const mechanicId = req.user._id;
        const orders = await ServiceOrder_1.default.find({ mechanic: mechanicId })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName email phone')
            .lean();
        res.json({ success: true, data: orders });
    }
    catch (err) {
        console.error('getMechanicServiceOrders error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMechanicServiceOrders = getMechanicServiceOrders;
const ACTIONS = {
    accept: {
        nextStatus: 'SERVICE_ORDER_CONFIRMED',
        roles: ['mechanic'],
        allowedCurrent: ['SERVICE_ORDER_PLACED'],
        buyerMessage: 'Your service booking has been confirmed by the mechanic.',
        mechanicMessage: 'You confirmed the service booking request.',
    },
    reject: {
        nextStatus: 'SERVICE_ORDER_REJECTED',
        roles: ['mechanic'],
        allowedCurrent: ['SERVICE_ORDER_PLACED'],
        buyerMessage: 'Your service booking request was rejected by the mechanic.',
        mechanicMessage: 'You rejected the service booking request.',
    },
    arrived: {
        nextStatus: 'BUYER_ARRIVED',
        roles: ['buyer'],
        allowedCurrent: ['SERVICE_ORDER_CONFIRMED'],
        buyerMessage: 'You have arrived for the service appointment.',
        mechanicMessage: 'The buyer has arrived for the service appointment.',
    },
    start: {
        nextStatus: 'SERVICE_IN_PROGRESS',
        roles: ['mechanic'],
        allowedCurrent: ['BUYER_ARRIVED'],
        buyerMessage: 'Service work has started.',
        mechanicMessage: 'You started the service work.',
    },
    complete: {
        nextStatus: 'SERVICE_COMPLETED',
        roles: ['mechanic'],
        allowedCurrent: ['SERVICE_IN_PROGRESS'],
        buyerMessage: 'The service work is completed.',
        mechanicMessage: 'You marked the service as completed.',
    },
    payment_received: {
        nextStatus: 'PAYMENT_RECEIVED',
        roles: ['mechanic'],
        allowedCurrent: ['SERVICE_COMPLETED'],
        buyerMessage: 'Payment has been confirmed by the mechanic.',
        mechanicMessage: 'You confirmed payment received for the service.',
    },
};
const updateServiceOrderStatus = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { action } = req.body;
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid service order id' });
            return;
        }
        if (!action || typeof action !== 'string' || !ACTIONS[action]) {
            res.status(400).json({ success: false, message: 'Invalid action' });
            return;
        }
        const order = await ServiceOrder_1.default.findById(id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Service order not found' });
            return;
        }
        const actionConfig = ACTIONS[action];
        if (!actionConfig.roles.includes(user.role)) {
            res.status(403).json({ success: false, message: 'You are not authorized to perform this action' });
            return;
        }
        if (!actionConfig.allowedCurrent.includes(order.status)) {
            res.status(400).json({ success: false, message: `Cannot ${action} when order is ${order.status}` });
            return;
        }
        const previousStatus = order.status;
        order.status = actionConfig.nextStatus;
        order.statusHistory.push({
            status: actionConfig.nextStatus,
            changedAt: new Date(),
            note: `${action} action executed from ${previousStatus}`,
        });
        await order.save();
        const buyerId = String(order.buyer);
        const mechanicId = String(order.mechanic);
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: buyerId,
            audience: 'buyer',
            orderId: order._id.toString(),
            status: order.status,
            title: getOrderStatusTitle(order.status),
            message: actionConfig.buyerMessage,
            actorRole: user.role,
        });
        (0, orderWorkflowEvents_1.emitOrderWorkflowEvent)({
            userId: mechanicId,
            audience: 'seller',
            orderId: order._id.toString(),
            status: order.status,
            title: getOrderStatusTitle(order.status),
            message: actionConfig.mechanicMessage,
            actorRole: user.role,
        });
        res.json({ success: true, data: order });
    }
    catch (err) {
        console.error('updateServiceOrderStatus error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateServiceOrderStatus = updateServiceOrderStatus;
function getOrderStatusTitle(status) {
    return serviceOrderStatus_1.SERVICE_ORDER_STATUS_LABELS[(0, serviceOrderStatus_1.normalizeServiceOrderStatus)(status)] || status;
}
