"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.getMechanicReviews = exports.getSellerReviews = exports.addMechanicReview = exports.addSellerReview = exports.getMyReviews = exports.getReviews = exports.addReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Product_1 = __importDefault(require("../models/Product"));
const Order_1 = __importDefault(require("../models/Order"));
const ServiceOrder_1 = __importDefault(require("../models/ServiceOrder"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const parseRating = (value) => {
    const rating = Number(value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        return null;
    return rating;
};
const hasValidComment = (value) => (typeof value === 'string' && value.trim().length > 0);
// Add Review
const addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { productId } = req.params;
        const buyerId = req.user._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            res.status(400).json({ message: 'Invalid product ID' });
            return;
        }
        const normalizedRating = parseRating(rating);
        if (normalizedRating === null || !hasValidComment(comment)) {
            res.status(400).json({ message: 'Rating (1-5) and comment are required' });
            return;
        }
        const product = await Product_1.default.findById(productId).select('_id');
        if (!product) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }
        // Only buyers who received the item can review it.
        const deliveredOrder = await Order_1.default.findOne({
            buyer: buyerId,
            status: { $in: ['delivered', 'completed'] },
            'items.product': new mongoose_1.default.Types.ObjectId(productId),
        }).select('_id');
        if (!deliveredOrder) {
            res.status(403).json({ message: 'You can review only delivered purchases' });
            return;
        }
        const existing = await Review_1.default.findOne({ productId, buyer: buyerId });
        if (existing) {
            existing.rating = normalizedRating;
            existing.comment = comment.trim();
            const updated = await existing.save();
            res.json(updated);
            return;
        }
        const newReview = new Review_1.default({
            productId,
            buyer: buyerId,
            rating: normalizedRating,
            comment: comment.trim(),
        });
        const savedReview = await newReview.save();
        res.status(201).json(savedReview);
    }
    catch (error) {
        res.status(500).json({ message: 'Error adding review', error });
    }
};
exports.addReview = addReview;
// Get Reviews by Product
const getReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            res.status(400).json({ message: 'Invalid product ID' });
            return;
        }
        const reviews = await Review_1.default.find({ productId }).sort({
            createdAt: -1,
        }).populate('buyer', 'firstName lastName avatar');
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching reviews', error });
    }
};
exports.getReviews = getReviews;
// Get logged-in buyer reviews
const getMyReviews = async (req, res) => {
    try {
        const buyerId = req.user._id;
        const reviews = await Review_1.default.find({ buyer: buyerId })
            .sort({ createdAt: -1 })
            .select('productId rating comment createdAt updatedAt')
            .lean();
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching your reviews', error });
    }
};
exports.getMyReviews = getMyReviews;
// Add Review for Seller
const addSellerReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { sellerId } = req.params;
        const buyerId = req.user._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(sellerId)) {
            res.status(400).json({ message: 'Invalid seller ID' });
            return;
        }
        const normalizedRating = parseRating(rating);
        if (normalizedRating === null || !hasValidComment(comment)) {
            res.status(400).json({ message: 'Rating (1-5) and comment are required' });
            return;
        }
        // Check if seller exists
        const sellerUser = await User_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(sellerId),
            role: 'seller',
        }).select('_id');
        if (!sellerUser) {
            res.status(404).json({ message: 'Seller not found' });
            return;
        }
        // Check if buyer has purchased from this seller
        const purchaseFromSeller = await Order_1.default.findOne({
            buyer: buyerId,
            seller: new mongoose_1.default.Types.ObjectId(sellerId),
            status: 'delivered',
        }).select('_id');
        if (!purchaseFromSeller) {
            res.status(403).json({ message: 'You can only review sellers you have purchased from' });
            return;
        }
        const existing = await Review_1.default.findOne({ sellerId: new mongoose_1.default.Types.ObjectId(sellerId), buyer: buyerId });
        if (existing) {
            existing.rating = normalizedRating;
            existing.comment = comment.trim();
            const updated = await existing.save();
            res.json(updated);
            return;
        }
        const newReview = new Review_1.default({
            sellerId: new mongoose_1.default.Types.ObjectId(sellerId),
            buyer: buyerId,
            rating: normalizedRating,
            comment: comment.trim(),
        });
        const savedReview = await newReview.save();
        res.status(201).json(savedReview);
    }
    catch (error) {
        res.status(500).json({ message: 'Error adding seller review', error });
    }
};
exports.addSellerReview = addSellerReview;
// Add Review for Mechanic
const addMechanicReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { mechanicId } = req.params;
        const buyerId = req.user._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(mechanicId)) {
            res.status(400).json({ message: 'Invalid mechanic ID' });
            return;
        }
        const normalizedRating = parseRating(rating);
        if (normalizedRating === null || !hasValidComment(comment)) {
            res.status(400).json({ message: 'Rating (1-5) and comment are required' });
            return;
        }
        // Check if mechanic exists
        const mechanicUser = await User_1.default.findOne({
            _id: new mongoose_1.default.Types.ObjectId(mechanicId),
            role: 'mechanic',
        }).select('_id');
        if (!mechanicUser) {
            res.status(404).json({ message: 'Mechanic not found' });
            return;
        }
        // Check if buyer has purchased from this mechanic
        const purchaseFromMechanic = await ServiceOrder_1.default.findOne({
            buyer: buyerId,
            mechanic: new mongoose_1.default.Types.ObjectId(mechanicId),
            status: { $in: ['SERVICE_COMPLETED', 'PAYMENT_RECEIVED'] },
        }).select('_id');
        if (!purchaseFromMechanic) {
            res.status(403).json({ message: 'You can only review mechanics after a completed service booking' });
            return;
        }
        const existing = await Review_1.default.findOne({ mechanicId: new mongoose_1.default.Types.ObjectId(mechanicId), buyer: buyerId });
        if (existing) {
            existing.rating = normalizedRating;
            existing.comment = comment.trim();
            const updated = await existing.save();
            res.json(updated);
            return;
        }
        const newReview = new Review_1.default({
            mechanicId: new mongoose_1.default.Types.ObjectId(mechanicId),
            buyer: buyerId,
            rating: normalizedRating,
            comment: comment.trim(),
        });
        const savedReview = await newReview.save();
        res.status(201).json(savedReview);
    }
    catch (error) {
        res.status(500).json({ message: 'Error adding mechanic review', error });
    }
};
exports.addMechanicReview = addMechanicReview;
// Get Reviews by Seller
const getSellerReviews = async (req, res) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(sellerId)) {
            res.status(400).json({ message: 'Invalid seller ID' });
            return;
        }
        const reviews = await Review_1.default.find({ sellerId: new mongoose_1.default.Types.ObjectId(sellerId) })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName avatar');
        // Calculate stats
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
        // Rating distribution
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            dist[r.rating] = (dist[r.rating] || 0) + 1;
        });
        res.json({
            success: true,
            data: {
                stats: {
                    average,
                    total,
                    recommended: total > 0 ? Math.round(((dist[4] + dist[5]) / total) * 100) : 0,
                },
                distribution: [5, 4, 3, 2, 1].map((stars) => ({
                    stars,
                    count: dist[stars],
                    percentage: total > 0 ? Math.round((dist[stars] / total) * 100) : 0,
                })),
                reviews,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching seller reviews', error });
    }
};
exports.getSellerReviews = getSellerReviews;
// Get Reviews by Mechanic
const getMechanicReviews = async (req, res) => {
    try {
        const { mechanicId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(mechanicId)) {
            res.status(400).json({ message: 'Invalid mechanic ID' });
            return;
        }
        const reviews = await Review_1.default.find({ mechanicId: new mongoose_1.default.Types.ObjectId(mechanicId) })
            .sort({ createdAt: -1 })
            .populate('buyer', 'firstName lastName avatar');
        // Calculate stats
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
        // Rating distribution
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            dist[r.rating] = (dist[r.rating] || 0) + 1;
        });
        res.json({
            success: true,
            data: {
                stats: {
                    average,
                    total,
                    recommended: total > 0 ? Math.round(((dist[4] + dist[5]) / total) * 100) : 0,
                },
                distribution: [5, 4, 3, 2, 1].map((stars) => ({
                    stars,
                    count: dist[stars],
                    percentage: total > 0 ? Math.round((dist[stars] / total) * 100) : 0,
                })),
                reviews,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching mechanic reviews', error });
    }
};
exports.getMechanicReviews = getMechanicReviews;
// Delete Review
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid review ID' });
            return;
        }
        const review = await Review_1.default.findById(id);
        if (!review) {
            res.status(404).json({ message: 'Review not found' });
            return;
        }
        const isAdmin = req.user?.role === 'admin';
        const isOwner = review.buyer.toString() === req.user._id.toString();
        if (!isAdmin && !isOwner) {
            res.status(403).json({ message: 'Not authorized to delete this review' });
            return;
        }
        await review.deleteOne();
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting review', error });
    }
};
exports.deleteReview = deleteReview;