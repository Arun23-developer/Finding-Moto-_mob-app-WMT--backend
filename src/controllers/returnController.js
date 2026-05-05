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
exports.completeReturnDelivery = exports.updateDeliveryAgentReturnStatus = exports.getDeliveryAgentReturnPickups = exports.assignReturnDeliveryAgent = exports.getAvailableDeliveryAgents = exports.updateReturnRequestStatus = exports.getManagedReturnRequests = exports.getBuyerReturnRequests = exports.createReturnRequest = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = __importDefault(require("../models/Order"));
const ReturnRequest_1 = __importStar(require("../models/ReturnRequest"));
const User_1 = __importDefault(require("../models/User"));
const orderStatus_1 = require("../utils/orderStatus");
const returnWorkflowEvents_1 = require("../utils/returnWorkflowEvents");
const MANAGER_STATUS_TRANSITIONS = {
    RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
    RETURN_DELIVERED: ['REFUND_INITIATED'],
    REFUND_INITIATED: ['REFUND_COMPLETED'],
};
const DELIVERY_AGENT_STATUS_TRANSITIONS = {
    RETURN_PICKUP_ASSIGNED: ['RETURN_PICKED_UP'],
    RETURN_PICKED_UP: ['RETURN_DELIVERED'],
    RETURN_IN_TRANSIT: ['RETURN_DELIVERED'],
};
const formatReturnRequest = (returnRequest) => ({
    _id: returnRequest._id,
    order: returnRequest.order,
    buyer: returnRequest.buyer,
    seller: returnRequest.seller,
    ownerRole: returnRequest.ownerRole || returnRequest.seller?.role || null,
    assigned_agent_id: returnRequest.assigned_agent_id || null,
    assigned_agent: returnRequest.assigned_agent_id &&
        typeof returnRequest.assigned_agent_id === 'object' &&
        ('firstName' in returnRequest.assigned_agent_id || 'lastName' in returnRequest.assigned_agent_id)
        ? {
            _id: returnRequest.assigned_agent_id._id,
            firstName: returnRequest.assigned_agent_id.firstName,
            lastName: returnRequest.assigned_agent_id.lastName,
            fullName: `${returnRequest.assigned_agent_id.firstName || ''} ${returnRequest.assigned_agent_id.lastName || ''}`.trim(),
            vehicleType: returnRequest.assigned_agent_id.vehicleType || '',
            vehicleNumber: returnRequest.assigned_agent_id.vehicleNumber || '',
        }
        : null,
    reason: returnRequest.reason,
    referencePhotos: returnRequest.referencePhotos || [],
    bankDetails: returnRequest.bankDetails,
    pickupAddress: returnRequest.pickupAddress,
    comments: returnRequest.comments || '',
    status: returnRequest.status,
    statusHistory: returnRequest.statusHistory || [],
    createdAt: returnRequest.createdAt,
    updatedAt: returnRequest.updatedAt,
});
const getActorRole = (role) => (role === 'mechanic' ? 'mechanic' : 'seller');
const populateReturnRequestForResponse = (returnRequest) => returnRequest.populate([
    { path: 'order', select: 'items totalAmount status shippingAddress paymentMethod createdAt' },
    { path: 'buyer', select: 'firstName lastName email phone address city postCode' },
    { path: 'seller', select: 'firstName lastName shopName workshopName role' },
    { path: 'assigned_agent_id', select: 'firstName lastName vehicleType vehicleNumber' },
]);
const LETTERS_ONLY_PATTERN = /^[A-Za-z\s.'-]+$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{8,16}$/;
const RETURNABLE_ORDER_STATUSES = new Set(['delivered']);
const normalizeText = (value) => value?.trim() || '';
const createReturnRequest = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const { orderId, reason, accountHolderName, bankName, accountNumber, branchName, ifscOrSwiftCode, fullAddress, city, district, postalCode, comments, } = req.body;
        const photos = Array.isArray(req.files) ? req.files : [];
        if (!orderId || !mongoose_1.default.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ success: false, message: 'A valid order is required' });
            return;
        }
        if (!reason || !ReturnRequest_1.RETURN_REASONS.includes(reason)) {
            res.status(400).json({ success: false, message: 'Please select a valid return reason' });
            return;
        }
        if (photos.length < 5 || photos.length > 8) {
            res.status(400).json({ success: false, message: 'Please upload 5 to 8 reference photos' });
            return;
        }
        const requiredFields = [
            { key: accountHolderName, label: 'Account holder name' },
            { key: bankName, label: 'Bank name' },
            { key: accountNumber, label: 'Account number' },
            { key: fullAddress, label: 'Pickup address' },
            { key: city, label: 'City' },
            { key: district, label: 'District' },
            { key: postalCode, label: 'Postal code' },
        ];
        const missingField = requiredFields.find((field) => !field.key?.trim());
        if (missingField) {
            res.status(400).json({ success: false, message: `${missingField.label} is required` });
            return;
        }
        const cleanAccountHolderName = normalizeText(accountHolderName);
        const cleanBankName = normalizeText(bankName);
        const cleanAccountNumber = normalizeText(accountNumber);
        if (!LETTERS_ONLY_PATTERN.test(cleanAccountHolderName)) {
            res.status(400).json({ success: false, message: 'Account holder name can contain only letters and spaces' });
            return;
        }
        if (!LETTERS_ONLY_PATTERN.test(cleanBankName)) {
            res.status(400).json({ success: false, message: 'Bank name can contain only letters and spaces' });
            return;
        }
        if (!ACCOUNT_NUMBER_PATTERN.test(cleanAccountNumber)) {
            res.status(400).json({ success: false, message: 'Account number must contain 8 to 16 digits only' });
            return;
        }
        const [order, existingRequest] = await Promise.all([
            Order_1.default.findOne({ _id: orderId, buyer: buyerId }),
            ReturnRequest_1.default.findOne({ order: orderId, buyer: buyerId }),
        ]);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        if (order.order_type && order.order_type !== 'product') {
            res.status(400).json({ success: false, message: 'Returns are only available for marketplace product orders.' });
            return;
        }
        if (!RETURNABLE_ORDER_STATUSES.has((0, orderStatus_1.normalizeOrderStatus)(order.status))) {
            res.status(400).json({ success: false, message: 'Only delivered orders can be returned before confirmation.' });
            return;
        }
        if (existingRequest) {
            res.status(400).json({ success: false, message: 'A return request already exists for this order' });
            return;
        }
        const referencePhotos = photos.map((file) => `/uploads/returns/${file.filename}`);
        const seller = await User_1.default.findById(order.seller).select('role');
        const sellerAudience = seller?.role === 'mechanic' ? 'mechanic' : 'seller';
        const returnRequest = await ReturnRequest_1.default.create({
            order: order._id,
            buyer: buyerId,
            seller: order.seller,
            ownerRole: sellerAudience,
            reason,
            referencePhotos,
            bankDetails: {
                accountHolderName: cleanAccountHolderName,
                bankName: cleanBankName,
                accountNumber: cleanAccountNumber,
                branchName: branchName?.trim() || '',
                ifscOrSwiftCode: ifscOrSwiftCode?.trim() || '',
            },
            pickupAddress: {
                fullAddress: fullAddress.trim(),
                city: city.trim(),
                district: district.trim(),
                postalCode: postalCode.trim(),
            },
            comments: comments?.trim() || '',
            status: 'RETURN_REQUESTED',
            statusHistory: [
                {
                    status: 'RETURN_REQUESTED',
                    changedAt: new Date(),
                    note: 'Return request submitted by buyer',
                },
            ],
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: String(order.buyer),
            audience: 'buyer',
            returnRequestId: returnRequest._id.toString(),
            orderId: order._id.toString(),
            status: 'RETURN_REQUESTED',
            title: 'Return request submitted',
            message: 'Your return request has been submitted successfully',
            actorRole: 'buyer',
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: String(order.seller),
            audience: sellerAudience,
            returnRequestId: returnRequest._id.toString(),
            orderId: order._id.toString(),
            status: 'RETURN_REQUESTED',
            title: 'New return request',
            message: 'A buyer has submitted a return request for a delivered order',
            actorRole: 'buyer',
        });
        await populateReturnRequestForResponse(returnRequest);
        res.status(201).json({ success: true, data: formatReturnRequest(returnRequest) });
    }
    catch (error) {
        if (error?.code === 11000) {
            res.status(400).json({ success: false, message: 'A return request already exists for this order' });
            return;
        }
        console.error('createReturnRequest error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createReturnRequest = createReturnRequest;
const getBuyerReturnRequests = async (req, res) => {
    try {
        const returns = await ReturnRequest_1.default.find({ buyer: req.user._id })
            .sort({ createdAt: -1 })
            .populate('order', 'items totalAmount status createdAt')
            .populate('seller', 'firstName lastName shopName workshopName role')
            .populate('assigned_agent_id', 'firstName lastName vehicleType vehicleNumber')
            .lean();
        res.json({ success: true, data: returns.map(formatReturnRequest) });
    }
    catch (error) {
        console.error('getBuyerReturnRequests error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getBuyerReturnRequests = getBuyerReturnRequests;
const getManagedReturnRequests = async (req, res) => {
    try {
        const returns = await ReturnRequest_1.default.find({ seller: req.user._id })
            .sort({ createdAt: -1 })
            .populate('order', 'items totalAmount status shippingAddress paymentMethod createdAt')
            .populate('buyer', 'firstName lastName email phone address city postCode')
            .populate('assigned_agent_id', 'firstName lastName vehicleType vehicleNumber')
            .lean();
        res.json({ success: true, data: returns.map(formatReturnRequest) });
    }
    catch (error) {
        console.error('getManagedReturnRequests error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getManagedReturnRequests = getManagedReturnRequests;
const updateReturnRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        if (!status || !ReturnRequest_1.RETURN_REQUEST_STATUSES.includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid return request status' });
            return;
        }
        const returnRequest = await ReturnRequest_1.default.findOne({ _id: id, seller: req.user._id });
        if (!returnRequest) {
            res.status(404).json({ success: false, message: 'Return request not found' });
            return;
        }
        if (!MANAGER_STATUS_TRANSITIONS[returnRequest.status]?.includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Seller or mechanic can only approve/reject returns and process refunds after the item is returned',
            });
            return;
        }
        const buyerId = returnRequest.buyer.toString();
        const sellerId = returnRequest.seller.toString();
        const orderId = returnRequest.order.toString();
        returnRequest.statusHistory.push({
            status,
            changedAt: new Date(),
            note: note?.trim() || `Status updated to ${status}`,
        });
        returnRequest.status = status;
        await returnRequest.save();
        if (status === 'REFUND_COMPLETED') {
            await Order_1.default.updateOne({ _id: returnRequest.order }, {
                $set: { status: 'refunded' },
                $push: {
                    statusHistory: {
                        status: 'refunded',
                        changedAt: new Date(),
                        note: 'Refund completed for return request',
                    },
                },
            });
        }
        await populateReturnRequestForResponse(returnRequest);
        const actorRole = getActorRole(req.user.role);
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: buyerId,
            audience: 'buyer',
            returnRequestId: returnRequest._id.toString(),
            orderId,
            status,
            title: 'Return status updated',
            message: status === 'RETURN_APPROVED'
                ? 'Your return request has been approved'
                : status === 'RETURN_REJECTED'
                    ? 'Your return request has been rejected'
                    : `Your return request is now ${status.replace(/_/g, ' ').toLowerCase()}`,
            actorRole,
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: sellerId,
            audience: actorRole,
            returnRequestId: returnRequest._id.toString(),
            orderId,
            status,
            title: 'Return status updated',
            message: `Return request updated to ${status.replace(/_/g, ' ')}`,
            actorRole,
        });
        res.json({ success: true, data: formatReturnRequest(returnRequest) });
    }
    catch (error) {
        console.error('updateReturnRequestStatus error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateReturnRequestStatus = updateReturnRequestStatus;
const getAvailableDeliveryAgents = async (req, res) => {
    try {
        const agents = await User_1.default.find({
            role: 'delivery_agent',
            approvalStatus: 'approved',
            active_status: { $ne: 'DISABLED' },
            isActive: true,
            isEmailVerified: true,
            agent_status: 'ENABLED',
            work_status: 'AVAILABLE',
        })
            .select('firstName lastName email phone vehicleType vehicleNumber')
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
                vehicleType: agent.vehicleType || '',
                vehicleNumber: agent.vehicleNumber || '',
            })),
        });
    }
    catch (error) {
        console.error('getAvailableDeliveryAgents error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getAvailableDeliveryAgents = getAvailableDeliveryAgents;
const assignReturnDeliveryAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { agentId, note } = req.body;
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid return request ID' });
            return;
        }
        if (!agentId || !mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            res.status(400).json({ success: false, message: 'Agent ID is required' });
            return;
        }
        const [returnRequest, agent] = await Promise.all([
            ReturnRequest_1.default.findOne({ _id: id, seller: req.user._id }),
            User_1.default.findById(agentId).select('firstName lastName role approvalStatus active_status isActive isEmailVerified agent_status work_status vehicleType vehicleNumber'),
        ]);
        if (!returnRequest) {
            res.status(404).json({ success: false, message: 'Return request not found' });
            return;
        }
        if (returnRequest.status !== 'RETURN_APPROVED') {
            res.status(400).json({
                success: false,
                message: 'Delivery agent can only be assigned to approved return requests',
            });
            return;
        }
        if (!agent ||
            agent.role !== 'delivery_agent' ||
            agent.approvalStatus !== 'approved' ||
            agent.active_status === 'DISABLED' ||
            !agent.isActive ||
            !agent.isEmailVerified ||
            agent.agent_status !== 'ENABLED' ||
            agent.work_status !== 'AVAILABLE') {
            res.status(400).json({ success: false, message: 'Invalid or unavailable delivery agent' });
            return;
        }
        const buyerId = returnRequest.buyer.toString();
        const sellerId = returnRequest.seller.toString();
        const orderId = returnRequest.order.toString();
        returnRequest.assigned_agent_id = agent._id;
        returnRequest.statusHistory.push({
            status: 'RETURN_PICKUP_ASSIGNED',
            changedAt: new Date(),
            note: note?.trim() || `Assigned to delivery agent ${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
        });
        returnRequest.status = 'RETURN_PICKUP_ASSIGNED';
        await returnRequest.save();
        await populateReturnRequestForResponse(returnRequest);
        const actorRole = getActorRole(req.user.role);
        const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Delivery agent';
        const returnRequestId = returnRequest._id.toString();
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: buyerId,
            audience: 'buyer',
            returnRequestId,
            orderId,
            status: 'RETURN_PICKUP_ASSIGNED',
            title: 'Delivery agent assigned for pickup',
            message: `${agentName} has been assigned to pick up your return package`,
            actorRole,
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: String(returnRequest.seller),
            audience: actorRole,
            returnRequestId,
            orderId,
            status: 'RETURN_PICKUP_ASSIGNED',
            title: 'Delivery agent assigned',
            message: `${agentName} has been assigned for return pickup`,
            actorRole,
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: String(agent._id),
            audience: 'delivery_agent',
            returnRequestId,
            orderId,
            status: 'RETURN_PICKUP_ASSIGNED',
            title: 'New return pickup assigned',
            message: `You have been assigned a return pickup from ${returnRequest.pickupAddress.city}`,
            actorRole: 'seller',
        });
        res.json({
            success: true,
            data: {
                ...formatReturnRequest(returnRequest),
                assigned_agent_id: agent._id,
                assigned_agent: {
                    _id: agent._id,
                    firstName: agent.firstName,
                    lastName: agent.lastName,
                    fullName: agentName,
                    vehicleType: agent.vehicleType,
                    vehicleNumber: agent.vehicleNumber,
                },
            },
        });
    }
    catch (error) {
        console.error('assignReturnDeliveryAgent error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.assignReturnDeliveryAgent = assignReturnDeliveryAgent;
const getDeliveryAgentReturnPickups = async (req, res) => {
    try {
        if (req.user.role !== 'delivery_agent') {
            res.status(403).json({ success: false, message: 'Only delivery agents can view their pickups' });
            return;
        }
        const returns = await ReturnRequest_1.default.find({
            assigned_agent_id: req.user._id,
            status: { $in: ['RETURN_PICKUP_ASSIGNED', 'RETURN_PICKED_UP', 'RETURN_IN_TRANSIT'] },
        })
            .sort({ createdAt: -1 })
            .populate('order', 'items totalAmount')
            .populate('buyer', 'firstName lastName email phone address city postCode')
            .populate('seller', 'firstName lastName shopName workshopName role')
            .lean();
        res.json({ success: true, data: returns.map(formatReturnRequest) });
    }
    catch (error) {
        console.error('getDeliveryAgentReturnPickups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getDeliveryAgentReturnPickups = getDeliveryAgentReturnPickups;
const updateDeliveryAgentReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        if (!status || !ReturnRequest_1.RETURN_REQUEST_STATUSES.includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid return request status' });
            return;
        }
        if (req.user.role !== 'delivery_agent') {
            res.status(403).json({ success: false, message: 'Only delivery agents can update return status' });
            return;
        }
        const returnRequest = await ReturnRequest_1.default.findOne({ _id: id, assigned_agent_id: req.user._id });
        if (!returnRequest) {
            res.status(404).json({ success: false, message: 'Return request not found or not assigned to you' });
            return;
        }
        const allowedStatuses = ['RETURN_PICKED_UP', 'RETURN_DELIVERED'];
        if (!allowedStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Delivery agent can only mark a return as picked up or returned',
            });
            return;
        }
        if (!DELIVERY_AGENT_STATUS_TRANSITIONS[returnRequest.status]?.includes(status)) {
            res.status(400).json({
                success: false,
                message: `Cannot transition from ${returnRequest.status} to ${status}`,
            });
            return;
        }
        const buyerId = returnRequest.buyer.toString();
        const sellerId = returnRequest.seller.toString();
        const orderId = returnRequest.order.toString();
        returnRequest.statusHistory.push({
            status,
            changedAt: new Date(),
            note: note?.trim() || `Status updated to ${status}`,
        });
        returnRequest.status = status;
        await returnRequest.save();
        await populateReturnRequestForResponse(returnRequest);
        const [agent, seller] = await Promise.all([
            User_1.default.findById(req.user._id).select('firstName lastName'),
            User_1.default.findById(sellerId).select('role'),
        ]);
        const agentName = `${agent?.firstName || ''} ${agent?.lastName || ''}`.trim() || 'Delivery agent';
        const returnRequestId = returnRequest._id.toString();
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: buyerId,
            audience: 'buyer',
            returnRequestId,
            orderId,
            status,
            title: 'Return pickup status updated',
            message: `Your return package is now ${status.replace(/_/g, ' ').toLowerCase()}`,
            actorRole: 'delivery_agent',
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: sellerId,
            audience: getActorRole(seller?.role || 'seller'),
            returnRequestId,
            orderId,
            status,
            title: 'Return pickup status updated',
            message: `Return package is now ${status.replace(/_/g, ' ').toLowerCase()} by ${agentName}`,
            actorRole: 'delivery_agent',
        });
        res.json({ success: true, data: formatReturnRequest(returnRequest) });
    }
    catch (error) {
        console.error('updateDeliveryAgentReturnStatus error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateDeliveryAgentReturnStatus = updateDeliveryAgentReturnStatus;
const completeReturnDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'delivery_agent') {
            res.status(403).json({ success: false, message: 'Only delivery agents can mark returns as delivered' });
            return;
        }
        const returnRequest = await ReturnRequest_1.default.findOne({ _id: id, assigned_agent_id: req.user._id });
        if (!returnRequest) {
            res.status(404).json({ success: false, message: 'Return request not found or not assigned to you' });
            return;
        }
        if (!['RETURN_PICKED_UP', 'RETURN_IN_TRANSIT'].includes(returnRequest.status)) {
            res.status(400).json({
                success: false,
                message: 'Return package must be picked up before marking as returned',
            });
            return;
        }
        const buyerId = returnRequest.buyer.toString();
        const sellerId = returnRequest.seller.toString();
        const orderId = returnRequest.order.toString();
        returnRequest.statusHistory.push({
            status: 'RETURN_DELIVERED',
            changedAt: new Date(),
            note: 'Return package delivered to seller/mechanic',
        });
        returnRequest.status = 'RETURN_DELIVERED';
        await returnRequest.save();
        await populateReturnRequestForResponse(returnRequest);
        const [agent, seller] = await Promise.all([
            User_1.default.findById(req.user._id).select('firstName lastName'),
            User_1.default.findById(sellerId).select('role'),
        ]);
        const agentName = `${agent?.firstName || ''} ${agent?.lastName || ''}`.trim() || 'Delivery agent';
        const returnRequestId = returnRequest._id.toString();
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: buyerId,
            audience: 'buyer',
            returnRequestId,
            orderId,
            status: 'RETURN_DELIVERED',
            title: 'Return package delivered',
            message: 'Your return package has been delivered to the seller/mechanic',
            actorRole: 'delivery_agent',
        });
        (0, returnWorkflowEvents_1.emitReturnWorkflowEvent)({
            userId: sellerId,
            audience: getActorRole(seller?.role || 'seller'),
            returnRequestId,
            orderId,
            status: 'RETURN_DELIVERED',
            title: 'Return package received',
            message: `Return package has been delivered by ${agentName}`,
            actorRole: 'delivery_agent',
        });
        res.json({ success: true, data: formatReturnRequest(returnRequest) });
    }
    catch (error) {
        console.error('completeReturnDelivery error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.completeReturnDelivery = completeReturnDelivery;
