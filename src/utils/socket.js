"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
exports.emitToUser = emitToUser;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
// Map userId -> Set of socketIds (user can have multiple tabs)
const onlineUsers = new Map();
let ioInstance = null;
function setupSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: [config_1.default.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
            credentials: true,
        },
    });
    ioInstance = io;
    // Authenticate socket connections via JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
            socket.userId = decoded.id;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        // Join a personal room for targeted messages
        socket.join(userId);
        // Broadcast online status
        io.emit('user:online', { userId });
        // Join a specific chat room
        socket.on('chat:join', (chatId) => {
            socket.join(`chat:${chatId}`);
        });
        // Leave a chat room
        socket.on('chat:leave', (chatId) => {
            socket.leave(`chat:${chatId}`);
        });
        // Handle new message — relay to other participants
        socket.on('chat:message', (data) => {
            // Send to the chat room (all participants watching this chat)
            socket.to(`chat:${data.chatId}`).emit('chat:message', {
                chatId: data.chatId,
                message: data.message,
            });
            // Also notify the recipient directly (for unread badge updates if not in chat room)
            socket.to(data.recipientId).emit('chat:notification', {
                chatId: data.chatId,
                message: data.message,
                senderId: userId,
            });
        });
        // Typing indicators
        socket.on('chat:typing', (data) => {
            socket.to(`chat:${data.chatId}`).emit('chat:typing', { userId, chatId: data.chatId });
        });
        socket.on('chat:stopTyping', (data) => {
            socket.to(`chat:${data.chatId}`).emit('chat:stopTyping', { userId, chatId: data.chatId });
        });
        // Messages read
        socket.on('chat:read', (data) => {
            socket.to(`chat:${data.chatId}`).emit('chat:read', { chatId: data.chatId, userId });
        });
        // Get online users list
        socket.on('users:online', () => {
            const online = Array.from(onlineUsers.keys());
            socket.emit('users:online', online);
        });
        socket.on('disconnect', () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    io.emit('user:offline', { userId });
                }
            }
        });
    });
    return io;
}
function emitToUser(userId, eventName, payload) {
    if (!ioInstance || !userId)
        return;
    ioInstance.to(userId).emit(eventName, payload);
}
