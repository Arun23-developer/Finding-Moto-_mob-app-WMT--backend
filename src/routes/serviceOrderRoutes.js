"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const serviceOrderController_1 = require("../controllers/serviceOrderController");
const router = express_1.default.Router();
router.use(auth_1.protect);
router.post('/', (0, auth_1.authorize)('buyer'), serviceOrderController_1.createServiceOrder);
router.get('/my', (0, auth_1.authorize)('buyer'), serviceOrderController_1.getBuyerServiceOrders);
router.get('/mechanic', (0, auth_1.authorize)('mechanic'), serviceOrderController_1.getMechanicServiceOrders);
router.put('/:id/status', (0, auth_1.authorize)('buyer', 'mechanic'), serviceOrderController_1.updateServiceOrderStatus);
exports.default = router;
