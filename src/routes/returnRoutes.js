"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const returnController_1 = require("../controllers/returnController");
const router = express_1.default.Router();
const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'returns');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 8 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.webp', '.jfif', '.avif', '.heic', '.heif']);
        if (file.mimetype.toLowerCase().startsWith('image/') || allowedExtensions.has(ext)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only image files are allowed'));
    },
});
router.use(auth_1.protect);
// Buyer routes
router.post('/', (0, auth_1.authorize)('buyer'), upload.array('referencePhotos', 8), returnController_1.createReturnRequest);
router.get('/my', (0, auth_1.authorize)('buyer'), returnController_1.getBuyerReturnRequests);
// Seller/Mechanic routes
router.get('/manage', (0, auth_1.authorize)('seller', 'mechanic'), returnController_1.getManagedReturnRequests);
router.patch('/:id/status', (0, auth_1.authorize)('seller', 'mechanic'), returnController_1.updateReturnRequestStatus);
// Delivery agent assignment (seller/mechanic only)
router.get('/agents/available', (0, auth_1.authorize)('seller', 'mechanic'), returnController_1.getAvailableDeliveryAgents);
router.patch('/:id/assign-agent', (0, auth_1.authorize)('seller', 'mechanic'), returnController_1.assignReturnDeliveryAgent);
// Delivery agent routes
router.get('/agent/pickups', (0, auth_1.authorize)('delivery_agent'), returnController_1.getDeliveryAgentReturnPickups);
router.patch('/:id/agent-status', (0, auth_1.authorize)('delivery_agent'), returnController_1.updateDeliveryAgentReturnStatus);
router.patch('/:id/complete-delivery', (0, auth_1.authorize)('delivery_agent'), returnController_1.completeReturnDelivery);
exports.default = router;
