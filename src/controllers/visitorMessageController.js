"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markVisitorMessageRead = exports.listVisitorMessages = exports.createVisitorMessage = void 0;
const VisitorMessage_1 = __importDefault(require("../models/VisitorMessage"));
const notifications_1 = require("../utils/notifications");
const nameRegex = /^[A-Za-z\s.'-]+$/;
const phoneRegex = /^\+94\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizePhone = (value) => {
    const phone = (value || '').replace(/\s+/g, '').trim();
    return phone || undefined;
};
const createVisitorMessage = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const phone = normalizePhone(req.body.phone);
        const message = String(req.body.message || '').trim();
        if (!name || !email || !message) {
            res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
            return;
        }
        if (!nameRegex.test(name)) {
            res.status(400).json({ success: false, message: 'Name can contain only letters and spaces.' });
            return;
        }
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
            return;
        }
        if (phone && !phoneRegex.test(phone)) {
            res.status(400).json({ success: false, message: 'Phone number must start with +94 and contain 9 digits after it.' });
            return;
        }
        const visitorMessage = await VisitorMessage_1.default.create({
            name,
            email,
            phone,
            message,
        });
        await (0, notifications_1.notifyRole)('admin', {
            category: 'SYSTEM_ALERT',
            title: 'New visitor message',
            message: `${name} sent a contact message.`,
            link: '/admin/visitor-messages',
            metadata: { visitorMessageId: visitorMessage._id.toString(), email, phone },
        });
        res.status(201).json({
            success: true,
            message: 'Message sent successfully.',
            data: visitorMessage,
        });
    }
    catch (error) {
        console.error('createVisitorMessage error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};
exports.createVisitorMessage = createVisitorMessage;
const listVisitorMessages = async (_req, res) => {
    try {
        const messages = await VisitorMessage_1.default.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: messages });
    }
    catch (error) {
        console.error('listVisitorMessages error:', error);
        res.status(500).json({ success: false, message: 'Failed to load visitor messages.' });
    }
};
exports.listVisitorMessages = listVisitorMessages;
const markVisitorMessageRead = async (req, res) => {
    try {
        const message = await VisitorMessage_1.default.findByIdAndUpdate(req.params.messageId, { status: 'READ' }, { new: true });
        if (!message) {
            res.status(404).json({ success: false, message: 'Visitor message not found.' });
            return;
        }
        res.json({ success: true, data: message });
    }
    catch (error) {
        console.error('markVisitorMessageRead error:', error);
        res.status(500).json({ success: false, message: 'Failed to update visitor message.' });
    }
};
exports.markVisitorMessageRead = markVisitorMessageRead;
