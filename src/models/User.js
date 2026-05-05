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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPROVAL_REQUIRED_ROLES = exports.USER_ROLES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.USER_ROLES = ['buyer', 'seller', 'mechanic', 'admin', 'delivery_agent'];
exports.APPROVAL_REQUIRED_ROLES = ['seller', 'mechanic', 'delivery_agent'];
const userSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'Please add a first name'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        minlength: 6,
        select: false
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    address: {
        type: String,
        trim: true,
        default: null
    },
    googleId: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: exports.USER_ROLES,
        default: 'buyer'
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    approvalNotes: {
        type: String,
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    active_status: {
        type: String,
        enum: ['ENABLED', 'DISABLED'],
        default: 'ENABLED',
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpires: {
        type: Date,
        default: null
    },
    // Seller-specific fields
    shopName: {
        type: String,
        trim: true,
        default: null
    },
    shopDescription: {
        type: String,
        trim: true,
        default: null
    },
    shopLocation: {
        type: String,
        trim: true,
        default: null
    },
    sellerSpecializations: {
        type: [String],
        default: [],
    },
    sellerBrands: {
        type: [String],
        default: [],
    },
    // Mechanic-specific fields
    specialization: {
        type: String,
        trim: true,
        default: null
    },
    experienceYears: {
        type: Number,
        default: null
    },
    workshopLocation: {
        type: String,
        trim: true,
        default: null
    },
    workshopName: {
        type: String,
        trim: true,
        default: null
    },
    servicesOffered: {
        type: [String],
        default: []
    },
    mechanicBrands: {
        type: [String],
        default: []
    },
    // Delivery agent-specific fields
    vehicleType: {
        type: String,
        trim: true,
        default: null
    },
    vehicleNumber: {
        type: String,
        trim: true,
        default: null
    },
    licenseNumber: {
        type: String,
        trim: true,
        default: null
    },
    payoutMethod: {
        type: String,
        trim: true,
        default: null
    },
    payoutAccountName: {
        type: String,
        trim: true,
        default: null
    },
    agent_status: {
        type: String,
        enum: ['ENABLED', 'DISABLED'],
        default: 'ENABLED'
    },
    work_status: {
        type: String,
        enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
        default: 'AVAILABLE'
    }
}, {
    timestamps: true
});
// Email is the sole unique identifier across all roles
userSchema.index({ email: 1 }, { unique: true });
// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
// Set approval status based on role before saving new users
userSchema.pre('save', async function (next) {
    // Hash password if modified
    if (this.isModified('password') && this.password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
    }
    // Set approval status for new users based on role
    if (this.isNew) {
        if (this.role === 'buyer') {
            this.approvalStatus = 'approved';
        }
        else if (exports.APPROVAL_REQUIRED_ROLES.includes(this.role)) {
            this.approvalStatus = 'pending';
            if (this.role === 'delivery_agent') {
                this.agent_status = 'DISABLED';
            }
        }
        else if (this.role === 'admin') {
            this.approvalStatus = 'approved';
        }
    }
    next();
});
// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password)
        return false;
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
// Check if user can login based on approval status
userSchema.methods.canLogin = function () {
    if (this.active_status === 'DISABLED')
        return false;
    if (!this.isActive)
        return false;
    // Buyers and admins can always login
    if (this.role === 'buyer' || this.role === 'admin')
        return true;
    // Delivery agents must be approved AND enabled
    if (this.role === 'delivery_agent') {
        return this.approvalStatus === 'approved' && this.agent_status === 'ENABLED';
    }
    // Sellers and mechanics need approval
    return this.approvalStatus === 'approved';
};
// Get approval message
userSchema.methods.getApprovalMessage = function () {
    if (this.active_status === 'DISABLED' || !this.isActive) {
        return 'Your account is disabled. Please contact support.';
    }
    if (this.role === 'buyer') {
        return 'Welcome! Your account is ready to use.';
    }
    if (this.role === 'delivery_agent') {
        if (this.approvalStatus === 'pending')
            return 'Your account is pending Admin approval.';
        if (this.approvalStatus === 'rejected')
            return 'Your account has been rejected by Admin.';
        if (this.agent_status !== 'ENABLED')
            return 'Your account is disabled. Please contact Admin.';
        return 'Welcome! Your delivery agent account is ready to use.';
    }
    if (this.approvalStatus === 'pending') {
        return 'Your account is pending admin approval. You will be notified once approved.';
    }
    if (this.approvalStatus === 'rejected') {
        return `Your account was not approved. ${this.approvalNotes || 'Please contact support for more information.'}`;
    }
    if (this.approvalStatus === 'approved') {
        return 'Your account has been approved! Welcome to Finding Moto.';
    }
    return 'Account status unknown. Please contact support.';
};
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
