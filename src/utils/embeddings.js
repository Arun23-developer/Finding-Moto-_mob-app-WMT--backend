"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshProductEmbeddingById = exports.refreshProductEmbedding = exports.cosineSimilarity = exports.createEmbedding = exports.buildProductEmbeddingText = exports.canUseEmbeddings = void 0;
const openai_1 = __importDefault(require("openai"));
const Product_1 = __importDefault(require("../models/Product"));
const EMBEDDING_MODEL = 'text-embedding-3-small';
const openai = new openai_1.default({ apiKey: process.env.OPENAI_KEY || '' });
const canUseEmbeddings = () => {
    return Boolean(process.env.OPENAI_KEY);
};
exports.canUseEmbeddings = canUseEmbeddings;
const buildProductEmbeddingText = (product) => {
    return [
        `name: ${product.name || ''}`,
        `category: ${product.category || ''}`,
        `brand: ${product.brand || ''}`,
        `description: ${product.description || ''}`,
    ].join('\n');
};
exports.buildProductEmbeddingText = buildProductEmbeddingText;
const createEmbedding = async (input) => {
    const value = input.trim();
    if (!value)
        return [];
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: value,
    });
    return response.data[0]?.embedding || [];
};
exports.createEmbedding = createEmbedding;
const cosineSimilarity = (a, b) => {
    if (a.length === 0 || b.length === 0 || a.length !== b.length)
        return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i += 1) {
        const x = a[i];
        const y = b[i];
        dot += x * y;
        magA += x * x;
        magB += y * y;
    }
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};
exports.cosineSimilarity = cosineSimilarity;
const refreshProductEmbedding = async (product) => {
    if (!(0, exports.canUseEmbeddings)())
        return;
    const text = (0, exports.buildProductEmbeddingText)(product);
    product.embedding = await (0, exports.createEmbedding)(text);
};
exports.refreshProductEmbedding = refreshProductEmbedding;
const refreshProductEmbeddingById = async (productId) => {
    if (!(0, exports.canUseEmbeddings)())
        return;
    const product = await Product_1.default.findById(productId);
    if (!product)
        return;
    await (0, exports.refreshProductEmbedding)(product);
    await product.save();
};
exports.refreshProductEmbeddingById = refreshProductEmbeddingById;
