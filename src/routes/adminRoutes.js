"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Admin Routes — Sujani ──────────────────────────────────────────────────
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const reportController_1 = require("../controllers/reportController");
const adminInfoController_1 = require("../controllers/adminInfoController");
const visitorMessageController_1 = require("../controllers/visitorMessageController");
const router = express_1.default.Router();
// All admin routes require JWT + admin role
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('admin'));
// Overview
router.get('/overview', adminController_1.getAdminOverview);
// Management routes
router.get('/products', adminController_1.getAdminProducts);
router.get('/orders', adminController_1.getAdminOrders);
router.get('/services', adminController_1.getAdminServices);
router.get('/reviews', adminController_1.getAdminReviews);
// User management
router.get('/pending', adminController_1.getPendingApprovals);
router.put('/approve/:userId', adminController_1.approveUser);
router.get('/users', adminController_1.getAllUsers);
router.get('/users/:userId', adminController_1.getUserById);
router.put('/toggle-active/:userId', adminController_1.toggleUserActive);
// Reports
router.get('/reports', reportController_1.adminListReports);
router.get('/reports/:reportId', reportController_1.adminGetReport);
router.put('/reports/:reportId/status', reportController_1.adminUpdateReportStatus);
router.put('/reports/:reportId/block', reportController_1.adminBlockReportedAccount);
// Admin information broadcasts
router.post('/info-to-users', adminInfoController_1.sendInfoToUsers);
// Visitor messages
router.get('/visitor-messages', visitorMessageController_1.listVisitorMessages);
router.put('/visitor-messages/:messageId/read', visitorMessageController_1.markVisitorMessageRead);
exports.default = router;
