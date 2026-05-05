"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCartItem = exports.updateCartItemQuantity = exports.addCartItem = exports.getCartItems = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const UNAVAILABLE_MESSAGE = 'This product is currently unavailable';
const OUT_OF_STOCK_MESSAGE = 'Product is currently out of stock';
const getBuyerId = (req) => req.user._id;
const parseRequestedQuantity = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return null;
    }
    return parsed;
};
const serializeCartItem = (item) => {
    const productDoc = item.product && typeof item.product === 'object' ? item.product : null;
    const productStatus = productDoc?.productStatus;
    const stock = typeof productDoc?.stock === 'number' ? productDoc.stock : undefined;
    const isUnavailable = !productDoc || productStatus === 'DISABLED';
    const isOutOfStock = !isUnavailable && typeof stock === 'number' && stock <= 0;
    return {
        _id: item._id,
        buyerId: item.buyer,
        productId: productDoc?._id || item.product,
        productName: item.productName,
        productImage: item.productImage || null,
        productPrice: item.productPrice,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        availableStock: stock ?? null,
        productStatus: productStatus || 'DISABLED',
        isAvailable: !isUnavailable && !isOutOfStock,
        unavailableMessage: isUnavailable ? UNAVAILABLE_MESSAGE : isOutOfStock ? OUT_OF_STOCK_MESSAGE : '',
        updatedAt: item.updatedAt,
    };
};
const refreshCartSnapshot = async (item) => {
    const productDoc = item.product && typeof item.product === 'object' ? item.product : null;
    if (!productDoc)
        return;
    const nextName = productDoc.name || item.productName;
    const nextImage = productDoc.images?.[0] || item.productImage || '';
    const nextPrice = productDoc.price ?? item.productPrice;
    const needsUpdate = item.productName !== nextName ||
        item.productImage !== nextImage ||
        item.productPrice !== nextPrice ||
        item.totalAmount !== nextPrice * item.quantity;
    if (!needsUpdate)
        return;
    item.productName = nextName;
    item.productImage = nextImage;
    item.productPrice = nextPrice;
    item.totalAmount = nextPrice * item.quantity;
    await item.save();
};
const getValidatedProduct = async (productId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return { error: { status: 400, message: 'Invalid product id' } };
    }
    const product = await Product_1.default.findById(productId);
    if (!product || product.productStatus === 'DISABLED') {
        return { error: { status: 400, message: UNAVAILABLE_MESSAGE } };
    }
    if (product.stock <= 0 || product.status === 'out_of_stock') {
        return { error: { status: 400, message: OUT_OF_STOCK_MESSAGE } };
    }
    return { product };
};
const hasValidationError = (result) => {
    return 'error' in result;
};
const getCartItems = async (req, res) => {
    try {
        const cartItems = await Cart_1.default.find({ buyer: getBuyerId(req) })
            .populate('product', 'name images price stock productStatus status')
            .sort({ updatedAt: -1 });
        for (const item of cartItems) {
            await refreshCartSnapshot(item);
        }
        const serializedItems = cartItems.map((item) => serializeCartItem(item.toObject({ depopulate: false })));
        const cartCount = serializedItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = serializedItems.reduce((sum, item) => sum + item.totalAmount, 0);
        res.json({
            success: true,
            data: {
                items: serializedItems,
                cartCount,
                subtotal,
            },
        });
    }
    catch (err) {
        console.error('getCartItems error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getCartItems = getCartItems;
const addCartItem = async (req, res) => {
    try {
        const buyerId = getBuyerId(req);
        const { productId, quantity } = req.body;
        if (!productId) {
            res.status(400).json({ success: false, message: 'Product id is required' });
            return;
        }
        const normalizedQuantity = parseRequestedQuantity(quantity);
        if (!normalizedQuantity) {
            res.status(400).json({ success: false, message: 'Quantity must be a whole number greater than 0' });
            return;
        }
        const validated = await getValidatedProduct(productId);
        if (hasValidationError(validated)) {
            res.status(validated.error.status).json({ success: false, message: validated.error.message });
            return;
        }
        const product = validated.product;
        let cartItem = await Cart_1.default.findOne({ buyer: buyerId, product: product._id });
        if (cartItem) {
            const nextQuantity = cartItem.quantity + normalizedQuantity;
            if (product.stock < nextQuantity) {
                res.status(400).json({ success: false, message: `Only ${product.stock} items available in stock` });
                return;
            }
            cartItem.productName = product.name;
            cartItem.productImage = product.images?.[0] || '';
            cartItem.productPrice = product.price;
            cartItem.quantity = nextQuantity;
            cartItem.totalAmount = product.price * nextQuantity;
            await cartItem.save();
            res.json({
                success: true,
                message: 'Product already in cart. Quantity updated.',
                data: serializeCartItem({ ...cartItem.toObject(), product }),
            });
            return;
        }
        if (product.stock < normalizedQuantity) {
            res.status(400).json({ success: false, message: `Only ${product.stock} items available in stock` });
            return;
        }
        cartItem = await Cart_1.default.create({
            buyer: buyerId,
            product: product._id,
            productName: product.name,
            productImage: product.images?.[0] || '',
            productPrice: product.price,
            quantity: normalizedQuantity,
            totalAmount: product.price * normalizedQuantity,
        });
        res.status(201).json({
            success: true,
            message: 'Product added to cart successfully',
            data: serializeCartItem({ ...cartItem.toObject(), product }),
        });
    }
    catch (err) {
        console.error('addCartItem error:', err);
        if (err?.code === 11000) {
            res.status(409).json({ success: false, message: 'Product already exists in cart' });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.addCartItem = addCartItem;
const updateCartItemQuantity = async (req, res) => {
    try {
        const buyerId = getBuyerId(req);
        const { id } = req.params;
        const { quantity } = req.body;
        const normalizedQuantity = parseRequestedQuantity(quantity);
        if (!normalizedQuantity) {
            res.status(400).json({ success: false, message: 'Quantity must be a whole number greater than 0' });
            return;
        }
        const cartItem = await Cart_1.default.findOne({ _id: id, buyer: buyerId });
        if (!cartItem) {
            res.status(404).json({ success: false, message: 'Cart item not found' });
            return;
        }
        const validated = await getValidatedProduct(cartItem.product.toString());
        if (hasValidationError(validated)) {
            res.status(validated.error.status).json({ success: false, message: validated.error.message });
            return;
        }
        const product = validated.product;
        if (product.stock < normalizedQuantity) {
            res.status(400).json({ success: false, message: `Only ${product.stock} items available in stock` });
            return;
        }
        cartItem.productName = product.name;
        cartItem.productImage = product.images?.[0] || '';
        cartItem.productPrice = product.price;
        cartItem.quantity = normalizedQuantity;
        cartItem.totalAmount = product.price * normalizedQuantity;
        await cartItem.save();
        res.json({
            success: true,
            message: 'Cart quantity updated successfully',
            data: serializeCartItem({ ...cartItem.toObject(), product }),
        });
    }
    catch (err) {
        console.error('updateCartItemQuantity error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateCartItemQuantity = updateCartItemQuantity;
const removeCartItem = async (req, res) => {
    try {
        const buyerId = getBuyerId(req);
        const cartItem = await Cart_1.default.findOneAndDelete({ _id: req.params.id, buyer: buyerId });
        if (!cartItem) {
            res.status(404).json({ success: false, message: 'Cart item not found' });
            return;
        }
        res.json({ success: true, message: 'Product removed from cart successfully' });
    }
    catch (err) {
        console.error('removeCartItem error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.removeCartItem = removeCartItem;
