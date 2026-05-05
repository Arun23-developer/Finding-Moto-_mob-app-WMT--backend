"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAllServices = exports.getPublicMechanicServices = exports.getPublicMechanicProfile = exports.getPublicSellerProfile = exports.getPublicMechanics = exports.getTrendingProducts = exports.getPublicProduct = exports.getPublicProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Review_1 = __importDefault(require("../models/Review"));
const User_1 = __importDefault(require("../models/User"));
const Service_1 = __importDefault(require("../models/Service"));
const mongoose_1 = __importDefault(require("mongoose"));
const PRODUCT_CATEGORY_TREE = {
    engine_system: ['piston', 'cylinder_block', 'crankshaft', 'camshaft', 'spark_plug'],
    fuel_system: ['fuel_injector', 'fuel_tank', 'fuel_pump', 'fuel_filter'],
    brake_system: ['brake_disc', 'brake_pad', 'brake_caliper'],
    transmission_system: ['clutch_plate', 'chain_sprocket', 'drive_chain'],
    suspension_system: ['front_fork', 'rear_shock_absorber', 'swing_arm'],
    electrical_system: ['battery', 'headlight', 'ecu', 'starter_motor', 'wiring_harness', 'indicators'],
    body_parts: ['seat', 'mirrors', 'mudguard', 'side_panel', 'number_plate_holder'],
    wheels: ['tyre', 'rim', 'spokes'],
};
const TOP_LEVEL_CATEGORIES = Object.keys(PRODUCT_CATEGORY_TREE);
const SUBCATEGORY_VALUES = TOP_LEVEL_CATEGORIES.flatMap((parent) => PRODUCT_CATEGORY_TREE[parent].map((child) => `${parent}/${child}`));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ENABLED_PRODUCT_STATUS_FILTER = {
    productStatus: 'ENABLED',
    status: { $in: ['active', 'out_of_stock'] },
};
const ENABLED_SERVICE_STATUS_FILTER = {
    productStatus: 'ENABLED',
    active: true,
};
const setNoStoreHeaders = (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
};
const enrichProductsWithReviews = async (products) => {
    if (products.length === 0) {
        return [];
    }
    const productIds = products.map((p) => p._id);
    const reviewStats = await Review_1.default.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
            $group: {
                _id: '$productId',
                avgRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 },
            },
        },
    ]);
    const reviewMap = new Map(reviewStats.map((r) => [r._id.toString(), { avgRating: r.avgRating, reviewCount: r.reviewCount }]));
    return products.map((p) => {
        const stats = reviewMap.get(p._id.toString());
        return {
            ...p,
            rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
            reviewCount: stats ? stats.reviewCount : 0,
            inStock: p.stock > 0,
            image: p.images?.[0] || null,
        };
    });
};
// @desc    Get all active products (public browsing)
// @route   GET /api/public/products
// @access  Public
const getPublicProducts = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const category = req.query.category;
        const brand = req.query.brand;
        const sort = req.query.sort;
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        const inStockOnly = req.query.inStockOnly === 'true';
        // Build filter
        const filter = { ...ENABLED_PRODUCT_STATUS_FILTER };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        if (category && category !== 'All') {
            if (TOP_LEVEL_CATEGORIES.includes(category)) {
                const escaped = escapeRegex(category);
                filter.category = { $regex: `^${escaped}(/|$)`, $options: 'i' };
            }
            else {
                const escaped = escapeRegex(category);
                filter.category = { $regex: `^${escaped}$`, $options: 'i' };
            }
        }
        if (brand && brand !== 'All Brands') {
            filter.brand = { $regex: `^${brand}$`, $options: 'i' };
        }
        if (!isNaN(minPrice)) {
            filter.price = { ...(filter.price || {}), $gte: minPrice };
        }
        if (!isNaN(maxPrice)) {
            filter.price = { ...(filter.price || {}), $lte: maxPrice };
        }
        if (inStockOnly) {
            filter.stock = { $gt: 0 };
        }
        // Build sort
        let sortObj = { createdAt: -1 };
        switch (sort) {
            case 'price_asc':
                sortObj = { price: 1 };
                break;
            case 'price_desc':
                sortObj = { price: -1 };
                break;
            case 'newest':
                sortObj = { createdAt: -1 };
                break;
            case 'popular':
                sortObj = { sales: -1 };
                break;
            case 'rating':
                sortObj = { sales: -1 }; // fallback, we'll sort by aggregated rating below
                break;
            default:
                sortObj = { createdAt: -1 };
        }
        const [products, total] = await Promise.all([
            Product_1.default.find(filter)
                .populate('seller', 'firstName lastName shopName workshopName')
                .sort(sortObj)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product_1.default.countDocuments(filter),
        ]);
        // Get review stats for these products
        const productIds = products.map((p) => p._id);
        const reviewStats = await Review_1.default.aggregate([
            { $match: { productId: { $in: productIds } } },
            {
                $group: {
                    _id: '$productId',
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const reviewMap = new Map(reviewStats.map((r) => [r._id.toString(), { avgRating: r.avgRating, reviewCount: r.reviewCount }]));
        // Merge review data into products
        const enrichedProducts = products.map((p) => {
            const stats = reviewMap.get(p._id.toString());
            return {
                ...p,
                rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
                reviewCount: stats ? stats.reviewCount : 0,
                inStock: p.stock > 0,
                image: p.images?.[0] || null,
            };
        });
        // Get available categories and brands for filter options
        const [categoriesList, brandsList] = await Promise.all([
            Product_1.default.distinct('category', ENABLED_PRODUCT_STATUS_FILTER),
            Product_1.default.distinct('brand', { ...ENABLED_PRODUCT_STATUS_FILTER, brand: { $ne: '' } }),
        ]);
        const mergedCategories = Array.from(new Set([...TOP_LEVEL_CATEGORIES, ...SUBCATEGORY_VALUES, ...categoriesList]))
            .filter(Boolean)
            .sort();
        res.json({
            success: true,
            data: enrichedProducts,
            filters: {
                categories: ['All', ...mergedCategories],
                brands: ['All Brands', ...brandsList.sort()],
            },
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error('getPublicProducts error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicProducts = getPublicProducts;
// @desc    Get single product detail (public)
// @route   GET /api/public/products/:id
// @access  Public
const getPublicProduct = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid product ID' });
            return;
        }
        const product = await Product_1.default.findOne({ _id: id, ...ENABLED_PRODUCT_STATUS_FILTER })
            .populate('seller', 'firstName lastName shopName workshopName')
            .lean();
        if (!product) {
            res.status(404).json({ success: false, message: 'This product/service is currently unavailable' });
            return;
        }
        // Increment views
        await Product_1.default.updateOne({ _id: id }, { $inc: { views: 1 } });
        // Get reviews for this product
        const reviews = await Review_1.default.find({ productId: id })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('buyer', 'firstName lastName avatar')
            .lean();
        const reviewStats = await Review_1.default.aggregate([
            { $match: { productId: new mongoose_1.default.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const stats = reviewStats[0] || { avgRating: 0, reviewCount: 0 };
        res.json({
            success: true,
            data: {
                ...product,
                rating: Math.round(stats.avgRating * 10) / 10,
                reviewCount: stats.reviewCount,
                inStock: product.stock > 0,
                image: product.images?.[0] || null,
                reviews,
            },
        });
    }
    catch (err) {
        console.error('getPublicProduct error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicProduct = getPublicProduct;
// @desc    Get trending products (top rated / most sold, limit 6)
// @route   GET /api/public/products/trending
// @access  Public
const getTrendingProducts = async (_req, res) => {
    try {
        setNoStoreHeaders(res);
        // Get active products sorted by sales, then views
        const products = await Product_1.default.find(ENABLED_PRODUCT_STATUS_FILTER)
            .populate('seller', 'firstName lastName shopName')
            .sort({ sales: -1, views: -1 })
            .limit(6)
            .lean();
        // Get review stats
        const productIds = products.map((p) => p._id);
        const reviewStats = await Review_1.default.aggregate([
            { $match: { productId: { $in: productIds } } },
            {
                $group: {
                    _id: '$productId',
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const reviewMap = new Map(reviewStats.map((r) => [r._id.toString(), { avgRating: r.avgRating, reviewCount: r.reviewCount }]));
        const enrichedProducts = products.map((p) => {
            const stats = reviewMap.get(p._id.toString());
            return {
                ...p,
                rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
                reviewCount: stats ? stats.reviewCount : 0,
                inStock: p.stock > 0,
                image: p.images?.[0] || null,
            };
        });
        res.json({ success: true, data: enrichedProducts });
    }
    catch (err) {
        console.error('getTrendingProducts error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getTrendingProducts = getTrendingProducts;
// @desc    Get approved mechanics / garages (public listing)
// @route   GET /api/public/mechanics
// @access  Public
const getPublicMechanics = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const search = req.query.search;
        const specialization = req.query.specialization;
        const filter = {
            role: 'mechanic',
            approvalStatus: 'approved',
            isActive: true,
        };
        if (search) {
            filter.$or = [
                { workshopName: { $regex: search, $options: 'i' } },
                { workshopLocation: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } },
            ];
        }
        if (specialization && specialization !== 'All Services') {
            filter.specialization = { $regex: specialization, $options: 'i' };
        }
        const mechanics = await User_1.default.find(filter)
            .select('firstName lastName phone avatar specialization experienceYears workshopLocation workshopName')
            .sort({ createdAt: -1 })
            .lean();
        // Get review stats for mechanics
        const mechanicIdsForReviews = mechanics.map((m) => m._id);
        const mechanicReviewStats = await Review_1.default.aggregate([
            { $match: { mechanicId: { $in: mechanicIdsForReviews } } },
            {
                $group: {
                    _id: '$mechanicId',
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const mechanicReviewMap = new Map(mechanicReviewStats.map((r) => [r._id.toString(), { avgRating: r.avgRating, reviewCount: r.reviewCount }]));
        // Fetch real services for each mechanic from the Service collection
        const mechanicIds = mechanics.map((m) => m._id);
        const allServices = await Service_1.default.find({ mechanic: { $in: mechanicIds }, ...ENABLED_SERVICE_STATUS_FILTER })
            .select('name mechanic category price')
            .lean();
        // Group services by mechanic id
        const serviceLookup = {};
        for (const svc of allServices) {
            const key = svc.mechanic.toString();
            if (!serviceLookup[key])
                serviceLookup[key] = [];
            serviceLookup[key].push({ name: svc.name, category: svc.category, price: svc.price });
        }
        // Map mechanics to a garage-like shape for frontend
        const garages = mechanics.map((m) => {
            const mechServices = serviceLookup[m._id.toString()] || [];
            const mechStats = mechanicReviewMap.get(m._id.toString());
            return {
                _id: m._id,
                name: m.workshopName || `${m.firstName} ${m.lastName}'s Workshop`,
                ownerName: `${m.firstName} ${m.lastName}`,
                address: m.workshopLocation || 'Location not specified',
                phone: m.phone || 'Not available',
                specialization: m.specialization || 'General Service',
                experienceYears: m.experienceYears || 0,
                avatar: m.avatar || null,
                rating: mechStats ? Math.round((mechStats.avgRating || 0) * 10) / 10 : 0,
                reviewCount: mechStats ? mechStats.reviewCount || 0 : 0,
                services: mechServices.length > 0
                    ? mechServices.map((s) => s.name)
                    : (m.specialization
                        ? m.specialization.split(',').map((s) => s.trim())
                        : ['General Service']),
                serviceDetails: mechServices,
                verified: true, // approved mechanics are verified
            };
        });
        // Get distinct specializations for filter
        const specializations = await User_1.default.distinct('specialization', {
            role: 'mechanic',
            approvalStatus: 'approved',
            isActive: true,
            specialization: { $nin: [null, ''] },
        });
        res.json({
            success: true,
            data: garages,
            filters: {
                specializations: ['All Services', ...specializations.filter(Boolean).sort()],
            },
        });
    }
    catch (err) {
        console.error('getPublicMechanics error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicMechanics = getPublicMechanics;
// @desc    Get public seller profile with active products
// @route   GET /api/public/sellers/:id
// @access  Public
const getPublicSellerProfile = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid seller id' });
            return;
        }
        const seller = await User_1.default.findOne({
            _id: id,
            role: 'seller',
            approvalStatus: 'approved',
            isActive: true,
        })
            .select('firstName lastName phone avatar shopName shopDescription shopLocation sellerSpecializations sellerBrands')
            .lean();
        if (!seller) {
            res.status(404).json({ success: false, message: 'Seller not found' });
            return;
        }
        const products = await Product_1.default.find({ seller: seller._id, ...ENABLED_PRODUCT_STATUS_FILTER })
            .sort({ createdAt: -1 })
            .lean();
        const enrichedProducts = await enrichProductsWithReviews(products);
        const sellerReviewStats = await Review_1.default.aggregate([
            { $match: { sellerId: new mongoose_1.default.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const stats = sellerReviewStats[0] || { avgRating: 0, reviewCount: 0 };
        res.json({
            success: true,
            data: {
                seller: {
                    ...seller,
                    name: seller.shopName || `${seller.firstName} ${seller.lastName}`,
                },
                stats: {
                    rating: Math.round((stats.avgRating || 0) * 10) / 10,
                    reviewCount: stats.reviewCount || 0,
                    productCount: enrichedProducts.length,
                },
                products: enrichedProducts,
            },
        });
    }
    catch (err) {
        console.error('getPublicSellerProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicSellerProfile = getPublicSellerProfile;
// @desc    Get public mechanic profile with services and products
// @route   GET /api/public/mechanics/:id
// @access  Public
const getPublicMechanicProfile = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid mechanic id' });
            return;
        }
        const mechanic = await User_1.default.findOne({
            _id: id,
            role: 'mechanic',
            approvalStatus: 'approved',
            isActive: true,
        })
            .select('firstName lastName phone avatar specialization experienceYears workshopLocation workshopName')
            .lean();
        if (!mechanic) {
            res.status(404).json({ success: false, message: 'Mechanic not found' });
            return;
        }
        const [services, products] = await Promise.all([
            Service_1.default.find({ mechanic: mechanic._id, ...ENABLED_SERVICE_STATUS_FILTER }).sort({ createdAt: -1 }).lean(),
            Product_1.default.find({ seller: mechanic._id, ...ENABLED_PRODUCT_STATUS_FILTER }).sort({ createdAt: -1 }).lean(),
        ]);
        const enrichedProducts = await enrichProductsWithReviews(products);
        const mechanicReviewStats = await Review_1.default.aggregate([
            { $match: { mechanicId: new mongoose_1.default.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);
        const stats = mechanicReviewStats[0] || { avgRating: 0, reviewCount: 0 };
        res.json({
            success: true,
            data: {
                mechanic: {
                    ...mechanic,
                    name: mechanic.workshopName || `${mechanic.firstName} ${mechanic.lastName}`,
                },
                stats: {
                    rating: Math.round((stats.avgRating || 0) * 10) / 10,
                    reviewCount: stats.reviewCount || 0,
                    serviceCount: services.length,
                    productCount: enrichedProducts.length,
                },
                services,
                products: enrichedProducts,
            },
        });
    }
    catch (err) {
        console.error('getPublicMechanicProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicMechanicProfile = getPublicMechanicProfile;
// @desc    Get active services for a specific mechanic (public)
// @route   GET /api/public/mechanics/:id/services
// @access  Public
const getPublicMechanicServices = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const mechanicId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(mechanicId)) {
            res.status(400).json({ success: false, message: 'Invalid mechanic id' });
            return;
        }
        const services = await Service_1.default.find({ mechanic: mechanicId, ...ENABLED_SERVICE_STATUS_FILTER })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, data: services });
    }
    catch (err) {
        console.error('getPublicMechanicServices error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicMechanicServices = getPublicMechanicServices;
// @desc    Get all active services from all mechanics (public listing)
// @route   GET /api/public/services
// @access  Public
const getPublicAllServices = async (req, res) => {
    try {
        setNoStoreHeaders(res);
        const search = req.query.search;
        const category = req.query.category;
        const filter = { ...ENABLED_SERVICE_STATUS_FILTER };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
            ];
        }
        if (category && category !== 'All') {
            filter.category = { $regex: `^${category}$`, $options: 'i' };
        }
        const services = await Service_1.default.find(filter)
            .populate('mechanic', 'firstName lastName workshopName workshopLocation phone avatar specialization experienceYears')
            .sort({ createdAt: -1 })
            .lean();
        // Get distinct categories for filter
        const categories = await Service_1.default.distinct('category', ENABLED_SERVICE_STATUS_FILTER);
        res.json({
            success: true,
            data: services,
            filters: {
                categories: ['All', ...categories.filter(Boolean).sort()],
            },
        });
    }
    catch (err) {
        console.error('getPublicAllServices error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPublicAllServices = getPublicAllServices;
