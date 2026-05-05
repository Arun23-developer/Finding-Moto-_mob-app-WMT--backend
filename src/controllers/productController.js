"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const embeddings_1 = require("../utils/embeddings");
const productCategories_1 = require("../constants/productCategories");
const notifications_1 = require("../utils/notifications");
const LOW_STOCK_THRESHOLD = 5;
const normalizeImagesInput = (input) => {
    const toCleanList = (values) => {
        const cleaned = values
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        return Array.from(new Set(cleaned));
    };
    if (Array.isArray(input)) {
        return toCleanList(input.filter((item) => typeof item === 'string'));
    }
    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed)
            return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return toCleanList(parsed.filter((item) => typeof item === 'string'));
                }
            }
            catch {
                // Fall through to comma-separated parsing.
            }
        }
        if (trimmed.includes(',')) {
            return toCleanList(trimmed.split(','));
        }
        return [trimmed];
    }
    return [];
};
const toOptionalNumber = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    return Number(value);
};
const rejectNegativeNumber = (value, label, res, required = false) => {
    const numberValue = toOptionalNumber(value);
    if (numberValue === undefined) {
        if (required) {
            res.status(400).json({ success: false, message: `${label} is required.` });
            return true;
        }
        return false;
    }
    if (!Number.isFinite(numberValue)) {
        res.status(400).json({ success: false, message: `${label} must be a valid number.` });
        return true;
    }
    if (numberValue < 0) {
        res.status(400).json({ success: false, message: `${label} must be 0 or greater.` });
        return true;
    }
    return false;
};
const rejectInvalidProductCategory = (value, res, required = false) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        if (required) {
            res.status(400).json({ success: false, message: 'Product category is required.' });
            return true;
        }
        return false;
    }
    if (!productCategories_1.PRODUCT_CATEGORY_SET.has(value.trim())) {
        res.status(400).json({
            success: false,
            message: `Product category must be one of: ${productCategories_1.PRODUCT_CATEGORIES.join(', ')}.`,
        });
        return true;
    }
    return false;
};
const maybeNotifyLowStock = async (product, ownerRole) => {
    if (product.type === 'service')
        return;
    const stock = Number(product.stock ?? 0);
    if (!Number.isFinite(stock) || stock > LOW_STOCK_THRESHOLD)
        return;
    if (ownerRole !== 'seller' && ownerRole !== 'mechanic')
        return;
    await (0, notifications_1.createNotification)({
        recipient: product.seller,
        role: ownerRole,
        category: ownerRole === 'mechanic' ? 'PARTS_ALERT' : 'LOW_STOCK',
        title: stock === 0 ? 'Product out of stock' : 'Low stock alert',
        message: `${product.name} has ${stock} unit${stock === 1 ? '' : 's'} remaining.`,
        link: ownerRole === 'mechanic' ? '/mechanic/products' : '/seller/products',
        metadata: {
            source: 'product_inventory',
            productId: product._id,
            stock,
        },
    });
};
// @desc    Get seller's products (paginated, filterable)
// @route   GET /api/products/seller
// @access  Private/Seller
const getProducts = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const search = req.query.search;
        const query = { seller: sellerId };
        if (status && status !== 'all')
            query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }
        const [products, total] = await Promise.all([
            Product_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product_1.default.countDocuments(query),
        ]);
        res.json({
            success: true,
            data: products,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error('getProducts error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getProducts = getProducts;
// @desc    Create a new product
// @route   POST /api/products/seller
// @access  Private/Seller
const createProduct = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { name, description, category, brand, price, originalPrice, stock, images, image, sku, type, status, productStatus, } = req.body;
        const normalizedImages = normalizeImagesInput(images ?? image).slice(0, 5);
        if (rejectNegativeNumber(price, 'Product price', res, true))
            return;
        if (type !== 'service' && rejectNegativeNumber(stock ?? 0, 'Product stock', res, true))
            return;
        if (rejectNegativeNumber(originalPrice, 'Original price', res))
            return;
        if (rejectInvalidProductCategory(category, res, true))
            return;
        if (normalizeImagesInput(images ?? image).length > 5) {
            res.status(400).json({ success: false, message: 'Maximum 5 photos allowed' });
            return;
        }
        const product = await Product_1.default.create({
            seller: sellerId,
            name,
            description,
            category,
            brand,
            price,
            originalPrice,
            stock: type === 'service' ? 99 : (stock ?? 0),
            images: normalizedImages,
            sku,
            type: type || 'product',
            status,
            productStatus,
        });
        await (0, embeddings_1.refreshProductEmbedding)(product);
        await product.save();
        await maybeNotifyLowStock(product, req.user.role);
        res.status(201).json({ success: true, data: product });
    }
    catch (err) {
        console.error('createProduct error:', err);
        if (err && typeof err === 'object' && 'name' in err && err.name === 'ValidationError') {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createProduct = createProduct;
// @desc    Update a product
// @route   PUT /api/products/seller/:id
// @access  Private/Seller
const updateProduct = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { id } = req.params;
        const nextImages = req.body.images;
        if (req.body.price !== undefined && rejectNegativeNumber(req.body.price, 'Product price', res))
            return;
        if (req.body.stock !== undefined && rejectNegativeNumber(req.body.stock, 'Product stock', res))
            return;
        if (req.body.originalPrice !== undefined && rejectNegativeNumber(req.body.originalPrice, 'Original price', res))
            return;
        if (req.body.category !== undefined && rejectInvalidProductCategory(req.body.category, res))
            return;
        const product = await Product_1.default.findOne({ _id: id, seller: sellerId });
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        if (Array.isArray(nextImages) && nextImages.length > 5) {
            res.status(400).json({ success: false, message: 'Maximum 5 photos allowed' });
            return;
        }
        const allowedFields = [
            'name', 'description', 'category', 'brand', 'price', 'originalPrice',
            'stock', 'images', 'status', 'productStatus', 'sku', 'type',
        ];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === 'images') {
                    product[field] = normalizeImagesInput(req.body[field]);
                    return;
                }
                product[field] = req.body[field];
            }
        });
        await product.save();
        await maybeNotifyLowStock(product, req.user.role);
        if (req.body.name !== undefined ||
            req.body.description !== undefined ||
            req.body.category !== undefined ||
            req.body.brand !== undefined) {
            await (0, embeddings_1.refreshProductEmbedding)(product);
            await product.save();
        }
        res.json({ success: true, data: product });
    }
    catch (err) {
        console.error('updateProduct error:', err);
        if (err && typeof err === 'object' && 'name' in err && err.name === 'ValidationError') {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateProduct = updateProduct;
// @desc    Delete a product
// @route   DELETE /api/products/seller/:id
// @access  Private/Seller
const deleteProduct = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { id } = req.params;
        const product = await Product_1.default.findOneAndDelete({ _id: id, seller: sellerId });
        if (!product) {
            res.status(404).json({ success: false, message: 'Product not found' });
            return;
        }
        res.json({ success: true, message: 'Product deleted' });
    }
    catch (err) {
        console.error('deleteProduct error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteProduct = deleteProduct;
