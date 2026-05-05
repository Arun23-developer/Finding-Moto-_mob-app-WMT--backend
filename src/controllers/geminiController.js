"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askGeminiAdvanced = void 0;
const config_1 = __importDefault(require("../config"));
const geminiMemory_1 = require("../utils/geminiMemory");
const geminiService_1 = require("../utils/geminiService");
const memory = new geminiMemory_1.GeminiMemoryManager();
const toSessionId = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const sessionId = value.trim().slice(0, 120);
    return sessionId || undefined;
};
const allowedRoles = ['buyer', 'mechanic', 'seller'];
const isGeminiRole = (role) => {
    return !!role && allowedRoles.includes(role);
};
const askGeminiAdvanced = async (req, res) => {
    try {
        const rawRole = req.user?.role;
        if (!isGeminiRole(rawRole)) {
            res.status(403).json({ success: false, message: 'Gemini chat is available only for buyer, mechanic, and seller roles.' });
            return;
        }
        const message = (0, geminiService_1.sanitizeGeminiMessage)(String(req.body?.message || ''));
        if (!message) {
            res.status(400).json({ success: false, message: 'Message is required' });
            return;
        }
        if (!config_1.default.geminiApiKey) {
            res.status(503).json({ success: false, message: 'GEMINI_API_KEY is missing in server environment.' });
            return;
        }
        const payloadSession = toSessionId(req.body?.sessionId);
        const headerSession = toSessionId(req.header('x-session-id'));
        const sessionKey = `${rawRole}:${payloadSession || headerSession || req.ip}`;
        memory.addUserMessage(sessionKey, message);
        const policyResult = (0, geminiService_1.evaluateGeminiPolicy)(message, rawRole);
        if (!policyResult.allowed) {
            const fallbackReply = policyResult.fallbackReply || 'This chatbot only supports bike and bike spare parts topics.';
            memory.addBotReply(sessionKey, fallbackReply);
            res.json({ success: true, data: { reply: fallbackReply } });
            return;
        }
        const service = (0, geminiService_1.createGeminiService)(config_1.default.geminiApiKey);
        const reply = await service.generateReply(message, rawRole, memory.getSnapshot(sessionKey));
        memory.addBotReply(sessionKey, reply);
        res.json({ success: true, data: { reply } });
    }
    catch (error) {
        console.error('askGeminiAdvanced error:', error);
        res.status(502).json({ success: false, message: 'Unable to process your request right now. Please try again later.' });
    }
};
exports.askGeminiAdvanced = askGeminiAdvanced;
