"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Auth Routes — Raakul ───────────────────────────────────────────────────
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const avatarUploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs_1.default.existsSync(avatarUploadsDir)) {
    fs_1.default.mkdirSync(avatarUploadsDir, { recursive: true });
}
const avatarStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarUploadsDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const avatarUpload = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime)
            return cb(null, true);
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    },
});
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/google', authController_1.googleAuth);
router.post('/verify-otp', authController_1.verifyOTP);
router.post('/resend-otp', authController_1.resendOTP);
router.get('/approval-status', authController_1.checkApprovalStatus);
// Protected routes (any authenticated user)
router.get('/me', auth_1.protect, authController_1.getMe);
router.put('/profile', auth_1.protect, authController_1.updateProfile);
router.post('/upload-avatar', auth_1.protect, avatarUpload.single('image'), authController_1.uploadAvatar);
router.put('/change-password', auth_1.protect, authController_1.changePassword);
router.post('/add-role', auth_1.protect, authController_1.addRole);
router.get('/my-roles', auth_1.protect, authController_1.getMyRoles);
exports.default = router;
