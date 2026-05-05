"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceOrderStatusLabel = exports.normalizeServiceOrderStatus = exports.SERVICE_ORDER_STATUS_FLOW = exports.isServiceOrderStatus = exports.SERVICE_ORDER_STATUS_LABELS = exports.SERVICE_ORDER_STATUSES = void 0;
exports.SERVICE_ORDER_STATUSES = [
    'SERVICE_ORDER_PLACED',
    'SERVICE_ORDER_CONFIRMED',
    'SERVICE_ORDER_REJECTED',
    'BUYER_ARRIVED',
    'SERVICE_IN_PROGRESS',
    'SERVICE_COMPLETED',
    'PAYMENT_RECEIVED',
];
exports.SERVICE_ORDER_STATUS_LABELS = {
    SERVICE_ORDER_PLACED: 'Placed',
    SERVICE_ORDER_CONFIRMED: 'Confirmed',
    SERVICE_ORDER_REJECTED: 'Rejected',
    BUYER_ARRIVED: 'Arrived',
    SERVICE_IN_PROGRESS: 'In Progress',
    SERVICE_COMPLETED: 'Completed',
    PAYMENT_RECEIVED: 'Payment Sent',
};
const isServiceOrderStatus = (status) => {
    if (!status)
        return false;
    const normalized = status.toString().trim().toUpperCase();
    return exports.SERVICE_ORDER_STATUSES.includes(normalized);
};
exports.isServiceOrderStatus = isServiceOrderStatus;
exports.SERVICE_ORDER_STATUS_FLOW = {
    SERVICE_ORDER_PLACED: ['SERVICE_ORDER_CONFIRMED', 'SERVICE_ORDER_REJECTED'],
    SERVICE_ORDER_CONFIRMED: ['BUYER_ARRIVED'],
    SERVICE_ORDER_REJECTED: [],
    BUYER_ARRIVED: ['SERVICE_IN_PROGRESS'],
    SERVICE_IN_PROGRESS: ['SERVICE_COMPLETED'],
    SERVICE_COMPLETED: ['PAYMENT_RECEIVED'],
    PAYMENT_RECEIVED: [],
};
const normalizeServiceOrderStatus = (status) => {
    if (!status)
        return 'SERVICE_ORDER_PLACED';
    const normalized = status.toString().trim().toUpperCase();
    if (exports.SERVICE_ORDER_STATUSES.includes(normalized)) {
        return normalized;
    }
    return 'SERVICE_ORDER_PLACED';
};
exports.normalizeServiceOrderStatus = normalizeServiceOrderStatus;
const getServiceOrderStatusLabel = (status) => {
    const normalized = (0, exports.normalizeServiceOrderStatus)(status);
    return exports.SERVICE_ORDER_STATUS_LABELS[normalized] ?? normalized;
};
exports.getServiceOrderStatusLabel = getServiceOrderStatusLabel;
