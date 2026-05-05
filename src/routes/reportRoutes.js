"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const reportController_1 = require("../controllers/reportController");
const router = express_1.default.Router();
router.use(auth_1.protect);
// Create a new report
router.post('/', reportController_1.createReport);
exports.default = router;
