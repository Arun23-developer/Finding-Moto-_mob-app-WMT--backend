"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const deliveryController_1 = require("../controllers/deliveryController");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.get('/dashboard', (0, auth_1.authorize)('delivery_agent'), deliveryController_1.getDeliveryDashboard);
router.get('/agents', (0, auth_1.authorize)('seller', 'mechanic', 'admin'), deliveryController_1.getDeliveryAgents);
router.get('/by-order/:orderId', (0, auth_1.authorize)('seller', 'mechanic', 'admin'), deliveryController_1.getDeliveryByOrderId);
router.post('/assign', (0, auth_1.authorize)('seller', 'mechanic', 'admin'), deliveryController_1.assignDelivery);
router.get('/my', (0, auth_1.authorize)('delivery_agent'), deliveryController_1.getMyDeliveries);
router.patch('/:id/status', (0, auth_1.authorize)('delivery_agent'), deliveryController_1.updateDeliveryStatus);
exports.default = router;
