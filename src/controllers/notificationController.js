"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearNotifications = exports.deleteNotification = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getNotifications = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
const toNotificationFilter = (req) => {
    const filter = {
        recipient: req.user._id,
        role: req.user.role,
    };
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const unreadOnly = req.query.unreadOnly === 'true';
    if (category && category !== 'all')
        filter.category = category;
    if (unreadOnly)
        filter.read = false;
    return filter;
};
const getNotifications = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 80, 200);
        const notifications = await Notification_1.default.find(toNotificationFilter(req))
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const unreadCount = await Notification_1.default.countDocuments({
            recipient: req.user._id,
            role: req.user.role,
            read: false,
        });
        res.json({ success: true, data: notifications, unreadCount });
    }
    catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to load notifications' });
    }
};
exports.getNotifications = getNotifications;
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid notification id' });
            return;
        }
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, recipient: req.user._id, role: req.user.role }, { read: true }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        res.json({ success: true, data: notification });
    }
    catch (error) {
        console.error('markNotificationRead error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification_1.default.updateMany({ recipient: req.user._id, role: req.user.role, read: false }, { read: true });
        res.json({ success: true, message: 'Notifications marked as read' });
    }
    catch (error) {
        console.error('markAllNotificationsRead error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notifications' });
    }
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid notification id' });
            return;
        }
        const deleted = await Notification_1.default.findOneAndDelete({
            _id: id,
            recipient: req.user._id,
            role: req.user.role,
        });
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        res.json({ success: true, message: 'Notification deleted' });
    }
    catch (error) {
        console.error('deleteNotification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};
exports.deleteNotification = deleteNotification;
const clearNotifications = async (req, res) => {
    try {
        await Notification_1.default.deleteMany({ recipient: req.user._id, role: req.user.role });
        res.json({ success: true, message: 'Notifications cleared' });
    }
    catch (error) {
        console.error('clearNotifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear notifications' });
    }
};
exports.clearNotifications = clearNotifications;
