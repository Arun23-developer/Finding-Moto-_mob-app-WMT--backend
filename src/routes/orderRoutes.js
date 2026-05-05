"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Order Routes — Saran ───────────────────────────────────────────────────
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const orderController_1 = require("../controllers/orderController");
const router = express_1.default.Router();
// All order routes require JWT
router.use(auth_1.protect);
// ─── Buyer routes ───────────────────────────────────────────────────────────
router.post('/', (0, auth_1.authorize)('buyer'), orderController_1.createOrder);
router.get('/my', (0, auth_1.authorize)('buyer'), orderController_1.getBuyerOrders);
router.patch('/my/:id/cancel', (0, auth_1.authorize)('buyer'), orderController_1.cancelBuyerOrder);
router.patch('/my/:id/confirm-received', (0, auth_1.authorize)('buyer'), orderController_1.confirmOrderReceived);
// ─── Seller / Mechanic routes ───────────────────────────────────────────────
router.get('/stats', (0, auth_1.authorize)('seller', 'mechanic'), orderController_1.getOrderStats);
router.get('/', (0, auth_1.authorize)('seller', 'mechanic'), orderController_1.getOrders);
router.patch('/:id/status', (0, auth_1.authorize)('seller', 'mechanic'), orderController_1.updateOrderStatus);
exports.default = router;
