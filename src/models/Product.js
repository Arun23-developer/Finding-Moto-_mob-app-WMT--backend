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
const productSchema = new mongoose_1.Schema({
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
    },
    brand: {
        type: String,
        default: '',
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
    },
    originalPrice: {
        type: Number,
        min: 0,
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    images: {
        type: [String],
        default: [],
        validate: {
            validator: (images) => (images ?? []).length <= 5,
            message: 'Maximum 5 photos allowed',
        },
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'out_of_stock'],
        default: 'active',
    },
    productStatus: {
        type: String,
        enum: ['ENABLED', 'DISABLED'],
        default: 'ENABLED',
    },
    views: {
        type: Number,
        default: 0,
    },
    sales: {
        type: Number,
        default: 0,
    },
    sku: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        enum: ['product', 'service'],
        default: 'product',
    },
    embedding: {
        type: [Number],
        default: [],
    },
}, { timestamps: true });
// Auto-set status to out_of_stock when stock hits 0
productSchema.pre('save', function (next) {
    if (this.stock === 0 && this.status === 'active') {
        this.status = 'out_of_stock';
    }
    if (this.stock > 0 && this.status === 'out_of_stock') {
        this.status = 'active';
    }
    next();
});
const Product = mongoose_1.default.model('Product', productSchema);
exports.default = Product;
