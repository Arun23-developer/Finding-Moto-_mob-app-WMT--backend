"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicChat = void 0;
const openai_1 = __importDefault(require("openai"));
const Product_1 = __importDefault(require("../models/Product"));
const embeddings_1 = require("../utils/embeddings");
const getOpenAIClient = () => {
    if (!process.env.OPENAI_KEY) {
        return null;
    }
    return new openai_1.default({
        apiKey: process.env.OPENAI_KEY,
    });
};
const publicChat = async (req, res) => {
    try {
        const userMessage = req.body?.message?.trim();
        if (!userMessage) {
            res.status(400).json({ reply: 'Message is required.' });
            return;
        }
        if (!process.env.OPENAI_KEY) {
            res.status(500).json({ reply: 'OPENAI_KEY is missing in server environment.' });
            return;
        }
        const openai = getOpenAIClient();
        if (!openai) {
            res.status(500).json({ reply: 'OPENAI_KEY is missing in server environment.' });
            return;
        }
        // Step 1: AI intent extraction
        const ai = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Extract key bike product search terms (bike model, part name, category) from the user message. Return only concise search text.',
                },
                { role: 'user', content: userMessage },
            ],
        });
        const intent = ai.choices[0]?.message?.content?.trim() || userMessage;
        let product = null;
        // Step 2a: Semantic search using product embeddings
        if ((0, embeddings_1.canUseEmbeddings)()) {
            const queryEmbedding = await (0, embeddings_1.createEmbedding)(intent || userMessage);
            const candidates = (await Product_1.default.find({
                status: { $ne: 'inactive' },
                productStatus: 'ENABLED',
                embedding: { $exists: true, $ne: [] },
            })
                .select('name price stock embedding description category brand')
                .lean());
            let bestScore = 0;
            let bestProduct = null;
            candidates.forEach((candidate) => {
                const score = (0, embeddings_1.cosineSimilarity)(queryEmbedding, candidate.embedding || []);
                if (score > bestScore) {
                    bestScore = score;
                    bestProduct = candidate;
                }
            });
            // Tuned threshold to avoid irrelevant matches
            if (bestProduct && bestScore >= 0.35) {
                product = bestProduct;
            }
        }
        // Step 2b: Fallback regex search when semantic search has no confident match
        if (!product) {
            product = (await Product_1.default.findOne({
                $or: [
                    { name: { $regex: intent, $options: 'i' } },
                    { description: { $regex: intent, $options: 'i' } },
                    { category: { $regex: intent, $options: 'i' } },
                    { brand: { $regex: intent, $options: 'i' } },
                ],
                status: { $ne: 'inactive' },
                productStatus: 'ENABLED',
            })
                .select('name price stock description category brand')
                .lean());
        }
        // Step 3: Response
        if (product) {
            res.json({
                reply: `Yes, we have ${product.name} for Rs.${product.price}. Stock: ${product.stock}`,
            });
            return;
        }
        res.json({
            reply: 'Sorry, product not available.',
        });
    }
    catch (error) {
        console.error('publicChat error:', error);
        res.status(500).json({
            reply: 'Server error.',
        });
    }
};
exports.publicChat = publicChat;
