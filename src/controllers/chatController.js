"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.getMyChats = exports.sendMessage = exports.getOrCreateChat = exports.getChatUsers = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
// Helper function to check if two users can chat
const canUserChat = (currentUser, recipient) => {
    // Buyers can chat with anyone (sellers, mechanics)
    if (currentUser.role === 'buyer') {
        return recipient.role === 'seller' || recipient.role === 'mechanic';
    }
    // Sellers can only chat with buyers
    if (currentUser.role === 'seller') {
        return recipient.role === 'buyer';
    }
    // Mechanics can only chat with buyers
    if (currentUser.role === 'mechanic') {
        return recipient.role === 'buyer';
    }
    // Admins can chat with anyone
    if (currentUser.role === 'admin') {
        return true;
    }
    return false;
};
const getOtherParticipant = (chat, userId) => chat.participants.find((p) => p._id.toString() !== userId.toString());
const getBuyerParticipant = (chat) => chat.participants.find((p) => p.role === 'buyer');
const hasBuyerMessage = (chat) => {
    const buyer = getBuyerParticipant(chat);
    if (!buyer)
        return false;
    return chat.messages.some((message) => message.sender.toString() === buyer._id.toString());
};
// Get list of sellers & mechanics that the buyer can chat with
// OR get buyers who have chatted with the seller/mechanic
const getChatUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;
        if (role === 'buyer') {
            // Buyers can browse approved sellers and mechanics
            const users = await User_1.default.find({
                role: { $in: ['seller', 'mechanic'] },
                isActive: true,
                approvalStatus: 'approved',
            }).select('firstName lastName role avatar shopName workshopName specialization');
            res.json(users);
        }
        else if (role === 'seller' || role === 'mechanic') {
            // Sellers/Mechanics: return ONLY buyers they have open conversations with
            // They cannot initiate chats with other sellers/mechanics
            const chats = await Chat_1.default.find({ participants: userId })
                .sort({ updatedAt: -1 })
                .populate('participants', 'firstName lastName role avatar shopName workshopName specialization');
            // Filter to show only buyers in the chat list
            const users = chats
                .filter((chat) => {
                const other = getOtherParticipant(chat, userId);
                return other?.role === 'buyer' && hasBuyerMessage(chat);
            })
                .map((chat) => {
                const other = getOtherParticipant(chat, userId);
                const unreadCount = chat.messages.filter((m) => m.sender.toString() !== userId.toString() && !m.read).length;
                return { user: other, chatId: chat._id, lastMessage: chat.lastMessage, unreadCount };
            });
            res.json(users);
        }
        else if (role === 'admin') {
            // Admins can see all users they've chatted with
            const chats = await Chat_1.default.find({ participants: userId })
                .sort({ updatedAt: -1 })
                .populate('participants', 'firstName lastName role avatar shopName workshopName specialization');
            const users = chats.map((chat) => {
                const other = chat.participants.find((p) => p._id.toString() !== userId.toString());
                const unreadCount = chat.messages.filter((m) => m.sender.toString() !== userId.toString() && !m.read).length;
                return { user: other, chatId: chat._id, lastMessage: chat.lastMessage, unreadCount };
            });
            res.json(users);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        console.error('getChatUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getChatUsers = getChatUsers;
// Get a chat between two users. Buyers may create a new chat; sellers/mechanics may only open existing buyer-started chats.
const getOrCreateChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { recipientId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(recipientId)) {
            res.status(400).json({ message: 'Invalid recipient ID' });
            return;
        }
        if (userId.toString() === recipientId) {
            res.status(400).json({ message: 'Cannot chat with yourself' });
            return;
        }
        // Check recipient exists
        const recipient = await User_1.default.findById(recipientId).select('firstName lastName role avatar shopName workshopName specialization');
        if (!recipient) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Validate chat permissions
        if (!canUserChat(req.user, recipient)) {
            res.status(403).json({
                message: 'Messaging is controlled by buyers. Sellers and mechanics can only reply to buyer conversations.'
            });
            return;
        }
        // Find existing chat
        let chat = await Chat_1.default.findOne({
            participants: { $all: [userId, recipientId], $size: 2 },
        }).populate('participants', 'firstName lastName role avatar shopName workshopName specialization');
        if (!chat && userRole !== 'buyer') {
            res.status(403).json({
                message: 'Only buyers can start a new conversation. You can reply after a buyer messages you.',
            });
            return;
        }
        if (!chat) {
            chat = await Chat_1.default.create({
                participants: [userId, recipientId],
                messages: [],
            });
            await chat.populate('participants', 'firstName lastName role avatar shopName workshopName specialization');
        }
        else if (userRole !== 'buyer' && !hasBuyerMessage(chat)) {
            res.status(403).json({
                message: 'You can reply only after the buyer sends the first message.',
            });
            return;
        }
        // Mark messages from recipient as read
        let modified = false;
        chat.messages.forEach((msg) => {
            if (msg.sender.toString() === recipientId && !msg.read) {
                msg.read = true;
                modified = true;
            }
        });
        if (modified)
            await chat.save();
        res.json({ chat, recipient });
    }
    catch (error) {
        console.error('getOrCreateChat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getOrCreateChat = getOrCreateChat;
// Send a message
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { chatId } = req.params;
        const { content } = req.body;
        if (!content || !content.trim()) {
            res.status(400).json({ message: 'Message content is required' });
            return;
        }
        if (content.length > 2000) {
            res.status(400).json({ message: 'Message is too long (max 2000 characters)' });
            return;
        }
        const chat = await Chat_1.default.findById(chatId)
            .populate('participants', 'role');
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        // Verify user is a participant
        const isParticipant = chat.participants.some((p) => p._id.toString() === userId.toString());
        if (!isParticipant) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        // Verify chat participants can communicate
        const otherParticipant = chat.participants.find((p) => p._id.toString() !== userId.toString());
        if (otherParticipant) {
            const currentUser = { role: userRole };
            if (!canUserChat(currentUser, otherParticipant)) {
                res.status(403).json({
                    message: 'Messaging is controlled by buyers. Sellers and mechanics can only reply to buyer conversations.'
                });
                return;
            }
        }
        if (userRole !== 'buyer' && !hasBuyerMessage(chat)) {
            res.status(403).json({
                message: 'You can reply only after the buyer sends the first message.',
            });
            return;
        }
        const message = {
            sender: userId,
            content: content.trim(),
            read: false,
            createdAt: new Date(),
        };
        chat.messages.push(message);
        chat.lastMessage = {
            content: content.trim(),
            sender: userId,
            createdAt: new Date(),
        };
        await chat.save();
        const savedMessage = chat.messages[chat.messages.length - 1];
        res.status(201).json(savedMessage);
    }
    catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
// Get user's conversations list
const getMyChats = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;
        const chats = await Chat_1.default.find({ participants: userId })
            .sort({ updatedAt: -1 })
            .populate('participants', 'firstName lastName role avatar shopName workshopName specialization');
        const visibleChats = chats.filter((chat) => {
            if (role === 'buyer' || role === 'admin')
                return true;
            const other = getOtherParticipant(chat, userId);
            return other?.role === 'buyer' && hasBuyerMessage(chat);
        });
        const result = visibleChats.map((chat) => {
            const other = getOtherParticipant(chat, userId);
            const unreadCount = chat.messages.filter((m) => m.sender.toString() !== userId.toString() && !m.read).length;
            return {
                chatId: chat._id,
                user: other,
                lastMessage: chat.lastMessage,
                unreadCount,
                updatedAt: chat.updatedAt,
            };
        });
        res.json(result);
    }
    catch (error) {
        console.error('getMyChats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMyChats = getMyChats;
// Mark messages as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        const isParticipant = chat.participants.some((p) => p.toString() === userId.toString());
        if (!isParticipant) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        let modified = false;
        chat.messages.forEach((msg) => {
            if (msg.sender.toString() !== userId.toString() && !msg.read) {
                msg.read = true;
                modified = true;
            }
        });
        if (modified)
            await chat.save();
        res.json({ message: 'Messages marked as read' });
    }
    catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
