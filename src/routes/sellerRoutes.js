"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Seller Dashboard Routes — Thulax ───────────────────────────────────────
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const sellerController_1 = require("../controllers/sellerController");
const router = express_1.default.Router();
// All seller dashboard routes require JWT + seller role
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('seller'));
// Overview & analytics
router.get('/dashboard', sellerController_1.getSellerDashboard);
router.get('/overview', sellerController_1.getOverview);
router.get('/analytics', sellerController_1.getAnalytics);
// Reviews
router.get('/reviews', sellerController_1.getSellerReviews);
// Profile
router.get('/profile', sellerController_1.getProfile);
router.put('/profile', sellerController_1.updateProfile);
exports.default = router;
