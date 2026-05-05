"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Product Routes — Arun ──────────────────────────────────────────────────
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const productController_1 = require("../controllers/productController");
const cloudinary_1 = require("../utils/cloudinary");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const isImageMime = file.mimetype.toLowerCase().startsWith('image/');
        if (isImageMime)
            return cb(null, true);
        cb(new Error('Only image files are allowed'));
    },
});
// All product routes require JWT + seller or mechanic role
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('seller', 'mechanic'));
// Image upload endpoint
router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file?.buffer) {
            res.status(400).json({ success: false, message: 'No image file provided' });
            return;
        }
        const imageUrl = await (0, cloudinary_1.uploadImageBuffer)(req.file.buffer, 'finding-moto/products');
        res.json({ success: true, data: { url: imageUrl } });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload image';
        res.status(500).json({ success: false, message });
    }
});
// Product CRUD
router.get('/', productController_1.getProducts);
router.post('/', productController_1.createProduct);
router.put('/:id', productController_1.updateProduct);
router.delete('/:id', productController_1.deleteProduct);
exports.default = router;
