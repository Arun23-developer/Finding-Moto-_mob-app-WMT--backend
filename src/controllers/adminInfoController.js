"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInfoToUsers = void 0;
const notifications_1 = require("../utils/notifications");
const ALLOWED_TARGET_ROLES = ['seller', 'mechanic', 'delivery_agent', 'buyer'];
const sendInfoToUsers = async (req, res) => {
    try {
        const { role, title, message } = req.body;
        if (!role || !ALLOWED_TARGET_ROLES.includes(role)) {
            res.status(400).json({ success: false, message: 'Select a valid user role.' });
            return;
        }
        const cleanTitle = title?.trim().slice(0, 120);
        const cleanMessage = message?.trim().slice(0, 500);
        if (!cleanTitle) {
            res.status(400).json({ success: false, message: 'Information title is required.' });
            return;
        }
        if (!cleanMessage) {
            res.status(400).json({ success: false, message: 'Information message is required.' });
            return;
        }
        await (0, notifications_1.notifyRole)(role, {
            category: 'ADMIN_ALERT',
            title: cleanTitle,
            message: cleanMessage,
            link: role === 'buyer' ? '/buyer/notifications' : role === 'delivery_agent' ? '/delivery/notifications' : `/${role}/notification`,
            metadata: {
                source: 'admin_information',
                sentBy: req.user._id,
                targetRole: role,
            },
        });
        res.json({ success: true, message: `Information sent to ${role.replace('_', ' ')} users.` });
    }
    catch (error) {
        console.error('sendInfoToUsers error:', error);
        res.status(500).json({ success: false, message: 'Failed to send information message.' });
    }
};
exports.sendInfoToUsers = sendInfoToUsers;
