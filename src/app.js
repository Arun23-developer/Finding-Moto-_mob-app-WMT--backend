"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const errorHandler_1 = require("./middleware/errorHandler");
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const sellerRoutes_1 = __importDefault(require("./routes/sellerRoutes"));
const mechanicRoutes_1 = __importDefault(require("./routes/mechanicRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const serviceOrderRoutes_1 = __importDefault(require("./routes/serviceOrderRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const deliveryRoutes_1 = __importDefault(require("./routes/deliveryRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const returnRoutes_1 = __importDefault(require("./routes/returnRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const visitorMessageController_1 = require("./controllers/visitorMessageController");
const app = (0, express_1.default)();
const allowedOrigins = Array.from(new Set([
    config_1.default.clientUrl,
    process.env.FRONTEND_URL,
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].filter(Boolean)));
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '12mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '12mb' }));
app.use((0, compression_1.default)({ threshold: 1024 }));
if (config_1.default.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Serve uploaded images as static files
const backendUploadsDir = path_1.default.join(__dirname, '..', 'uploads');
const legacyUploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads');
app.use('/uploads', express_1.default.static(backendUploadsDir));
app.use('/uploads', express_1.default.static(legacyUploadsDir));
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'OK',
        message: 'Finding Moto API is running',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});
app.use('/api', (req, res, next) => {
    if (req.path === '/health') {
        next();
        return;
    }
    if (mongoose_1.default.connection.readyState !== 1) {
        res.status(503).json({
            success: false,
            message: 'Database unavailable. Please try again shortly.',
        });
        return;
    }
    next();
});
// Routes
app.post('/api/public/contact', visitorMessageController_1.createVisitorMessage);
app.use('/api/public', publicRoutes_1.default); // Public â€” No auth required (products/mechanics browsing)
app.use('/api/auth', authRoutes_1.default); // Raakul â€” User Management
app.use('/api/seller', sellerRoutes_1.default); // Thulax â€” Seller Dashboard
app.use('/api/mechanic', mechanicRoutes_1.default); // Thulax â€” Mechanic Dashboard
app.use('/api/products', productRoutes_1.default); // Arun   â€” Product Management
app.use('/api/orders', orderRoutes_1.default); // Saran  â€” Order Management
app.use('/api/service-orders', serviceOrderRoutes_1.default); // New service order lifecycle
app.use('/api/admin', adminRoutes_1.default); // Sujani â€” Admin Dashboard
app.use('/api/reviews', reviewRoutes_1.default); // Sivaganga â€” Rating & Review
app.use('/api/chat', chatRoutes_1.default); // Chat â€” Real-time messaging
app.use('/api/ai', aiRoutes_1.default); // AI assistant â€” Gemini-powered
app.use('/api/deliveries', deliveryRoutes_1.default);
app.use('/api/cart', cartRoutes_1.default);
app.use('/api/returns', returnRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// Error handler
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
exports.default = app;
