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
const mongoose_1 = __importStar(require("mongoose"));
const serviceOrderStatus_1 = require("../utils/serviceOrderStatus");
const serviceOrderSchema = new mongoose_1.Schema({
    buyer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanic: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName: { type: String, required: true },
    servicePrice: { type: Number, required: true, min: 0 },
    bookingDate: { type: Date, required: true },
    notes: { type: String, default: '' },
    status: { type: String, required: true, enum: serviceOrderStatus_1.SERVICE_ORDER_STATUSES, default: 'SERVICE_ORDER_PLACED' },
    statusHistory: [
        {
            status: { type: String, enum: serviceOrderStatus_1.SERVICE_ORDER_STATUSES, required: true },
            changedAt: { type: Date, default: Date.now },
            note: { type: String },
        },
    ],
}, { timestamps: true });
serviceOrderSchema.index({ buyer: 1 });
serviceOrderSchema.index({ mechanic: 1 });
serviceOrderSchema.index({ service: 1 });
serviceOrderSchema.index({ status: 1 });
const ServiceOrder = mongoose_1.default.model('ServiceOrder', serviceOrderSchema);
exports.default = ServiceOrder;
