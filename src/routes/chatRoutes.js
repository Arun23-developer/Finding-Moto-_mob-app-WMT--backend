"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const publicChatController_1 = require("../controllers/publicChatController");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// Public chatbot endpoint used by frontend chatbot widget
router.post('/', publicChatController_1.publicChat);
// All routes require authentication
router.use(auth_1.protect);
// GET /api/chat/users — list sellers/mechanics (for buyers) or chat partners
router.get('/users', chatController_1.getChatUsers);
// GET /api/chat/conversations — list user's chats
router.get('/conversations', chatController_1.getMyChats);
// GET /api/chat/:recipientId — get or create chat with a user
router.get('/:recipientId', chatController_1.getOrCreateChat);
// POST /api/chat/:chatId/messages — send a message
router.post('/:chatId/messages', chatController_1.sendMessage);
// PUT /api/chat/:chatId/read — mark messages as read
router.put('/:chatId/read', chatController_1.markAsRead);
exports.default = router;
