"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const mechanicController_1 = require("../controllers/mechanicController");
const cloudinary_1 = require("../utils/cloudinary");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.toLowerCase().startsWith('image/')) {
            cb(null, true);
            return;
        }
        cb(new Error('Only image files are allowed'));
    },
});
// All mechanic routes require JWT + mechanic role
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('mechanic'));
// Overview
router.get('/dashboard', mechanicController_1.getMechanicDashboard);
router.get('/overview', mechanicController_1.getOverview);
router.get('/reviews', mechanicController_1.getMechanicReviews);
// Profile
router.get('/profile', mechanicController_1.getProfile);
router.put('/profile', mechanicController_1.updateProfile);
// Services CRUD
router.get('/services', mechanicController_1.getServices);
router.post('/services/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file?.buffer) {
            res.status(400).json({ success: false, message: 'No image file provided' });
            return;
        }
        const imageUrl = await (0, cloudinary_1.uploadImageBuffer)(req.file.buffer, 'finding-moto/services');
        res.json({ success: true, data: { url: imageUrl } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload image';
        res.status(500).json({ success: false, message });
    }
});
router.post('/services', mechanicController_1.createService);
router.put('/services/:id', mechanicController_1.updateService);
router.delete('/services/:id', mechanicController_1.deleteService);
exports.default = router;
