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
exports.RETURN_REQUEST_STATUSES = exports.RETURN_REASONS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.RETURN_REASONS = [
    'Damaged Product',
    'Wrong Product Delivered',
    'Product Quality Issue',
    'Not as Described',
    'Defective Product',
    'Other',
];
exports.RETURN_REQUEST_STATUSES = [
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'RETURN_PICKUP_ASSIGNED',
    'RETURN_PICKED_UP',
    'RETURN_IN_TRANSIT',
    'RETURN_DELIVERED',
    'REFUND_INITIATED',
    'REFUND_COMPLETED',
];
const returnBankDetailsSchema = new mongoose_1.Schema({
    accountHolderName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    branchName: { type: String, trim: true, default: '' },
    ifscOrSwiftCode: { type: String, trim: true, default: '' },
}, { _id: false });
const returnPickupAddressSchema = new mongoose_1.Schema({
    fullAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
}, { _id: false });
const returnRequestSchema = new mongoose_1.Schema({
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true,
    },
    buyer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    ownerRole: {
        type: String,
        enum: ['seller', 'mechanic'],
        index: true,
    },
    reason: {
        type: String,
        enum: exports.RETURN_REASONS,
        required: true,
    },
    referencePhotos: {
        type: [String],
        required: true,
        validate: {
            validator: (value) => Array.isArray(value) && value.length >= 5 && value.length <= 8,
            message: 'Return request must include 5 to 8 reference photos',
        },
    },
    bankDetails: {
        type: returnBankDetailsSchema,
        required: true,
    },
    pickupAddress: {
        type: returnPickupAddressSchema,
        required: true,
    },
    comments: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: exports.RETURN_REQUEST_STATUSES,
        default: 'RETURN_REQUESTED',
    },
    statusHistory: [
        {
            status: {
                type: String,
                enum: exports.RETURN_REQUEST_STATUSES,
                required: true,
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
            note: {
                type: String,
                trim: true,
                default: '',
            },
        },
    ],
    assigned_agent_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, { timestamps: true });
returnRequestSchema.index({ order: 1, buyer: 1 }, { unique: true });
returnRequestSchema.index({ seller: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ assigned_agent_id: 1, status: 1, createdAt: -1 });
const ReturnRequest = mongoose_1.default.model('ReturnRequest', returnRequestSchema);
exports.default = ReturnRequest;
