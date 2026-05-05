"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyRole = notifyRole;
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const socket_1 = require("./socket");
async function createNotification({ recipient, role, category, title, message, link, metadata, }) {
    if (!recipient)
        return null;
    const notification = await Notification_1.default.create({
        recipient,
        role,
        category,
        title,
        message,
        link,
        metadata: metadata || {},
    });
    (0, socket_1.emitToUser)(notification.recipient.toString(), 'notification:new', {
        _id: notification._id,
        recipient: notification.recipient,
        role: notification.role,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
    });
    return notification;
}
async function notifyRole(role, input) {
    const users = await User_1.default.find({ role, isActive: true }).select('_id');
    await Promise.all(users.map((user) => createNotification({
        ...input,
        recipient: user._id,
        role,
    })));
}
