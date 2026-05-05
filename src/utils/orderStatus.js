"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTerminalOrderStatus = exports.getOrderStatusLabel = exports.normalizeOrderStatus = exports.ORDER_STATUS_FLOW = exports.ORDER_STATUS_LABELS = exports.ORDER_STATUSES = void 0;
exports.ORDER_STATUSES = [
    'pending',
    'awaiting_seller_confirmation',
    'confirmed',
    'rejected',
    'processing',
    'ready_for_dispatch',
    'pickup_assigned',
    'picked_up',
    'out_for_delivery',
    'delivery_failed',
    'delivered',
    'completed',
    'cancelled',
    'refunded',
    'shipped',
];
exports.ORDER_STATUS_LABELS = {
    pending: 'Pending',
    awaiting_seller_confirmation: 'Placed',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    processing: 'Processing',
    ready_for_dispatch: 'Package Ready',
    pickup_assigned: 'Delivery Agent Assigned',
    picked_up: 'Picked Up',
    out_for_delivery: 'Out for Delivery',
    delivery_failed: 'Delivery Failed',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    shipped: 'Out for Delivery',
};
exports.ORDER_STATUS_FLOW = {
    pending: ['awaiting_seller_confirmation', 'cancelled'],
    awaiting_seller_confirmation: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['processing', 'ready_for_dispatch', 'cancelled'],
    rejected: ['refunded'],
    processing: ['ready_for_dispatch', 'cancelled'],
    ready_for_dispatch: ['pickup_assigned', 'cancelled'],
    pickup_assigned: ['picked_up'],
    picked_up: ['out_for_delivery'],
    out_for_delivery: ['delivered', 'delivery_failed'],
    delivery_failed: [],
    delivered: ['completed'],
    completed: ['refunded'],
    cancelled: ['refunded'],
    refunded: [],
    shipped: ['delivered'],
};
const LEGACY_STATUS_MAP = {
    shipped: 'out_for_delivery',
};
const normalizeOrderStatus = (status) => {
    if (!status)
        return 'pending';
    const normalized = status.toLowerCase();
    if (exports.ORDER_STATUSES.includes(normalized)) {
        return normalized;
    }
    return LEGACY_STATUS_MAP[normalized] ?? 'pending';
};
exports.normalizeOrderStatus = normalizeOrderStatus;
const getOrderStatusLabel = (status) => {
    const normalized = (0, exports.normalizeOrderStatus)(status);
    return exports.ORDER_STATUS_LABELS[normalized] ?? normalized;
};
exports.getOrderStatusLabel = getOrderStatusLabel;
const isTerminalOrderStatus = (status) => {
    const normalized = (0, exports.normalizeOrderStatus)(status);
    return ['rejected', 'delivery_failed', 'completed', 'cancelled', 'refunded'].includes(normalized);
};
exports.isTerminalOrderStatus = isTerminalOrderStatus;
