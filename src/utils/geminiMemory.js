"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiMemoryManager = void 0;
const MAX_USER_MESSAGES = 3;
const MAX_BOT_REPLIES = 2;
class GeminiMemoryManager {
    constructor() {
        this.store = new Map();
    }
    getSnapshot(sessionKey) {
        const session = this.store.get(sessionKey);
        if (!session) {
            return {
                userMessages: [],
                botReplies: [],
            };
        }
        return {
            userMessages: [...session.userMessages],
            botReplies: [...session.botReplies],
        };
    }
    addUserMessage(sessionKey, message) {
        const session = this.getOrCreateSession(sessionKey);
        session.userMessages.push(message);
        if (session.userMessages.length > MAX_USER_MESSAGES) {
            session.userMessages = session.userMessages.slice(-MAX_USER_MESSAGES);
        }
    }
    addBotReply(sessionKey, reply) {
        const session = this.getOrCreateSession(sessionKey);
        session.botReplies.push(reply);
        if (session.botReplies.length > MAX_BOT_REPLIES) {
            session.botReplies = session.botReplies.slice(-MAX_BOT_REPLIES);
        }
    }
    getOrCreateSession(sessionKey) {
        const existing = this.store.get(sessionKey);
        if (existing) {
            return existing;
        }
        const created = {
            userMessages: [],
            botReplies: [],
        };
        this.store.set(sessionKey, created);
        return created;
    }
}
exports.GeminiMemoryManager = GeminiMemoryManager;
