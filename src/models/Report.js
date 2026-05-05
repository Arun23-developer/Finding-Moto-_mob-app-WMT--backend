"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_ACTIONS = exports.REPORT_STATUSES = exports.REPORT_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.REPORT_CATEGORIES = ['ACCOUNT', 'PRODUCT', 'SERVICE', 'DELIVERY'];
exports.REPORT_STATUSES = ['PENDING', 'RESOLVED', 'REJECTED'];
exports.REPORT_ACTIONS = ['NONE', 'RESOLVED', 'REJECTED', 'BLOCKED_ACCOUNT'];
const reportSchema = new mongoose_1.Schema({
    category: {
        type: String,
        enum: exports.REPORT_CATEGORIES,
        required: true,
        index: true,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    status: {
        type: String,
        enum: exports.REPORT_STATUSES,
        default: 'PENDING',
        index: true,
    },
    adminAction: {
        type: String,
        enum: exports.REPORT_ACTIONS,
        default: 'NONE',
    },
    adminNotes: {
        type: String,
        default: null,
        trim: true,
        maxlength: 1000,
    },
    reviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    reportedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    reportedUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    reportedProduct: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        default: null,
    },
    reportedService: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Service',
        default: null,
    },
    reportedDelivery: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Delivery',
        default: null,
    },
}, { timestamps: true });
reportSchema.index({ category: 1, status: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, status: 1, createdAt: -1 });
const Report = mongoose_1.default.model('Report', reportSchema);
exports.default = Report;
