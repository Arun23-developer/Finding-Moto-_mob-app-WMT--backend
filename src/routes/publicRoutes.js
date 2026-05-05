"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Public Routes — No authentication required ────────────────────────────
const express_1 = __importDefault(require("express"));
const visitorMessageController_1 = require("../controllers/visitorMessageController");
const publicController_1 = require("../controllers/publicController");
const router = express_1.default.Router();
// Visitor contact messages
router.post('/contact', visitorMessageController_1.createVisitorMessage);
// Products (public browsing)
router.get('/products/trending', publicController_1.getTrendingProducts);
router.get('/products/:id', publicController_1.getPublicProduct);
router.get('/products', publicController_1.getPublicProducts);
// Mechanics / Garages (public listing)
router.get('/mechanics', publicController_1.getPublicMechanics);
router.get('/sellers/:id', publicController_1.getPublicSellerProfile);
// Mechanic services (public)
router.get('/mechanics/:id/services', publicController_1.getPublicMechanicServices);
router.get('/mechanics/:id', publicController_1.getPublicMechanicProfile);
router.get('/services', publicController_1.getPublicAllServices);
exports.default = router;
