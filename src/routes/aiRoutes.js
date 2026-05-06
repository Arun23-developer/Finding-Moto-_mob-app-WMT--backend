"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Main AI chat endpoint — powered by DeepSeek
router.post('/chat', aiController_1.askAI);
exports.default = router;
