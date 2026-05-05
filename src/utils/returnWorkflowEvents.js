"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitReturnWorkflowEvent = emitReturnWorkflowEvent;
const socket_1 = require("./socket");
const notifications_1 = require("./notifications");
const toNotificationCategory = (status) => {
    if (status === 'REFUND_INITIATED' || status === 'REFUND_COMPLETED')
        return 'REFUND';
    if (status === 'RETURN_PICKUP_ASSIGNED' || status === 'RETURN_PICKED_UP' || status === 'RETURN_DELIVERED') {
        return 'PICKUP_REQUEST';
    }
    return 'RETURN';
};
const getNotificationLink = (audience) => {
    if (audience === 'buyer')
        return '/buyer/returns-claims';
    if (audience === 'delivery_agent')
        return '/delivery/assigned';
    if (audience === 'mechanic')
        return '/mechanic/returns-claims';
    return '/seller/returns-claims';
};
function emitReturnWorkflowEvent({ userId, audience, returnRequestId, orderId, status, title, message, actorRole, }) {
    if (!userId)
        return;
    (0, socket_1.emitToUser)(userId, 'return:workflow', {
        type: 'return_workflow',
        audience,
        returnRequestId,
        orderId,
        status,
        title,
        message,
        actorRole,
        timestamp: new Date().toISOString(),
    });
    void (0, notifications_1.createNotification)({
        recipient: userId,
        role: audience,
        category: toNotificationCategory(status),
        title,
        message,
        link: getNotificationLink(audience),
        metadata: {
            source: 'return_workflow',
            returnRequestId,
            orderId,
            status,
            actorRole,
        },
    });
}
