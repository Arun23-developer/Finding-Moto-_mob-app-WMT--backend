"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOrderWorkflowEvent = emitOrderWorkflowEvent;
const socket_1 = require("./socket");
const orderStatus_1 = require("./orderStatus");
const serviceOrderStatus_1 = require("./serviceOrderStatus");
const notifications_1 = require("./notifications");
const getWorkflowStatusLabel = (status) => {
    if ((0, serviceOrderStatus_1.isServiceOrderStatus)(status)) {
        return (0, serviceOrderStatus_1.getServiceOrderStatusLabel)(status);
    }
    const orderStatus = status;
    return (0, orderStatus_1.getOrderStatusLabel)(orderStatus);
};
const toNotificationCategory = (audience, status) => {
    if (audience === 'delivery_agent') {
        return status.includes('pickup') || status === 'ASSIGNED' ? 'PICKUP_REQUEST' : 'DELIVERY_ASSIGNMENT';
    }
    if ((0, serviceOrderStatus_1.isServiceOrderStatus)(status))
        return 'SERVICE_REQUEST';
    return 'ORDER';
};
const getNotificationLink = (audience, status) => {
    if (audience === 'buyer')
        return '/my-orders';
    if (audience === 'delivery_agent')
        return '/delivery/assigned';
    if ((0, serviceOrderStatus_1.isServiceOrderStatus)(status))
        return '/mechanic/orders';
    return '/seller/orders';
};
const getNotificationRole = (audience, status) => {
    if ((0, serviceOrderStatus_1.isServiceOrderStatus)(status) && audience === 'seller')
        return 'mechanic';
    return audience;
};
function emitOrderWorkflowEvent({ userId, audience, orderId, status, title, message, actorRole, }) {
    if (!userId)
        return;
    const statusLabel = getWorkflowStatusLabel(status);
    (0, socket_1.emitToUser)(userId, 'order:workflow', {
        type: 'order_workflow',
        audience,
        orderId,
        status,
        statusLabel,
        title,
        message,
        actorRole,
        timestamp: new Date().toISOString(),
    });
    void (0, notifications_1.createNotification)({
        recipient: userId,
        role: getNotificationRole(audience, status),
        category: toNotificationCategory(audience, status),
        title,
        message,
        link: getNotificationLink(audience, status),
        metadata: {
            source: 'order_workflow',
            orderId,
            status,
            statusLabel,
            actorRole,
        },
    });
}
