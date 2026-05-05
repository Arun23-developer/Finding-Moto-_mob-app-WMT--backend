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
exports.getMyRoles = exports.addRole = exports.changePassword = exports.checkApprovalStatus = exports.uploadAvatar = exports.updateProfile = exports.getMe = exports.resendOTP = exports.verifyOTP = exports.googleAuth = exports.login = exports.register = void 0;
const User_1 = __importStar(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const config_1 = __importDefault(require("../config"));
const google_auth_library_1 = require("google-auth-library");
const email_1 = require("../utils/email");
const resolveMx = (0, util_1.promisify)(dns_1.default.resolveMx);
const normalizeEmail = (value) => value.trim().toLowerCase();
const nameRegex = /^[A-Za-z\s.'-]+$/;
const businessNameRegex = /^[A-Za-z0-9\s.'-]+$/;
const phoneRegex = /^\d{1,10}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/;
// Validate email format and domain MX records
const validateEmail = async (email) => {
    // Strict format check
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { valid: false, reason: 'Invalid email format' };
    }
    // Check domain has MX records (can actually receive email)
    // If DNS is unavailable, allow the email through (soft check)
    const domain = email.split('@')[1];
    try {
        const mxRecords = await resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return { valid: false, reason: 'Email domain cannot receive emails' };
        }
    }
    catch (err) {
        // Only reject if domain definitively doesn't exist (ENOTFOUND)
        // Allow through on network errors (ECONNREFUSED, ETIMEOUT, etc.)
        if (err?.code === 'ENOTFOUND') {
            return { valid: false, reason: 'Email domain does not exist' };
        }
        // DNS unavailable — skip MX check, allow registration
        console.warn(`DNS MX lookup skipped for ${domain}: ${err?.code || err?.message}`);
    }
    return { valid: true };
};
const googleClient = new google_auth_library_1.OAuth2Client(config_1.default.googleClientId);
// Generate JWT Token
const generateToken = (id, role) => {
    const secret = config_1.default.jwtSecret;
    const options = { expiresIn: config_1.default.jwtExpiresIn };
    return jsonwebtoken_1.default.sign({ id: id.toString(), role }, secret, options);
};
// Format user response
const formatUser = (user) => ({
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    avatar: user.avatar,
    role: user.role,
    approvalStatus: user.approvalStatus,
    isActive: user.isActive,
    shopName: user.shopName,
    shopDescription: user.shopDescription,
    shopLocation: user.shopLocation,
    sellerSpecializations: user.sellerSpecializations || [],
    sellerBrands: user.sellerBrands || [],
    specialization: user.specialization,
    experienceYears: user.experienceYears,
    workshopLocation: user.workshopLocation,
    workshopName: user.workshopName,
    vehicleType: user.vehicleType,
    vehicleNumber: user.vehicleNumber,
    licenseNumber: user.licenseNumber,
    payoutMethod: user.payoutMethod,
    payoutAccountName: user.payoutAccountName
});
// @desc    Register new user (buyer, seller, mechanic, or delivery agent)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, role, shopName, shopDescription, shopLocation, specialization, experienceYears, workshopLocation, workshopName, vehicleType, vehicleNumber, licenseNumber, payoutMethod, payoutAccountName } = req.body;
        if (!firstName || !lastName || !email || !password || !phone) {
            res.status(400).json({ message: 'Please fill in all required fields' });
            return;
        }
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = String(phone).replace(/\D/g, '').trim();
        if (trimmedFirstName.length < 2 || !nameRegex.test(trimmedFirstName)) {
            res.status(400).json({ message: 'First name must be at least 2 characters and cannot contain numbers' });
            return;
        }
        if (trimmedLastName.length < 2 || !nameRegex.test(trimmedLastName)) {
            res.status(400).json({ message: 'Last name must be at least 2 characters and cannot contain numbers' });
            return;
        }
        if (!phoneRegex.test(normalizedPhone)) {
            res.status(400).json({ message: 'Phone number must contain digits only and be at most 10 digits long' });
            return;
        }
        if (!strongPasswordRegex.test(password)) {
            res.status(400).json({ message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character' });
            return;
        }
        // Validate role
        const validRoles = User_1.USER_ROLES.filter((candidateRole) => candidateRole !== 'admin');
        const userRole = role || 'buyer';
        if (!validRoles.includes(userRole)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }
        // Validate role-specific required fields
        if (userRole === 'seller' && !shopName) {
            res.status(400).json({ message: 'Shop name is required for sellers' });
            return;
        }
        if (shopName && !businessNameRegex.test(shopName.trim())) {
            res.status(400).json({ message: 'Shop name may contain letters, numbers, spaces, apostrophes, hyphens, and periods only' });
            return;
        }
        if (userRole === 'mechanic' && !specialization) {
            res.status(400).json({ message: 'Specialization is required for mechanics' });
            return;
        }
        if (workshopName && !businessNameRegex.test(workshopName.trim())) {
            res.status(400).json({ message: 'Workshop name may contain letters, numbers, spaces, apostrophes, hyphens, and periods only' });
            return;
        }
        if (userRole === 'delivery_agent' && (!vehicleType || !vehicleNumber || !licenseNumber)) {
            res.status(400).json({ message: 'Vehicle type, vehicle number, and license number are required for delivery agents' });
            return;
        }
        // Validate email format and domain
        const emailCheck = await validateEmail(normalizedEmail);
        if (!emailCheck.valid) {
            res.status(400).json({ message: emailCheck.reason });
            return;
        }
        // Check if user already exists with this email (email is the sole unique identifier)
        const userExists = await User_1.default.findOne({ email: normalizedEmail });
        if (userExists) {
            res.status(400).json({ message: 'An account with this email already exists' });
            return;
        }
        // Build user data
        const userData = {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: normalizedEmail,
            password,
            phone: normalizedPhone,
            role: userRole
        };
        // Add seller-specific fields
        if (userRole === 'seller') {
            userData.shopName = shopName;
            userData.shopDescription = shopDescription;
            userData.shopLocation = shopLocation;
        }
        // Add mechanic-specific fields
        if (userRole === 'mechanic') {
            userData.specialization = specialization;
            userData.experienceYears = experienceYears;
            userData.workshopLocation = workshopLocation;
            userData.workshopName = workshopName;
        }
        if (userRole === 'delivery_agent') {
            userData.vehicleType = vehicleType;
            userData.vehicleNumber = vehicleNumber;
            userData.licenseNumber = licenseNumber;
            userData.payoutMethod = payoutMethod;
            userData.payoutAccountName = payoutAccountName;
        }
        // Create user
        const user = await User_1.default.create(userData);
        // Generate and save OTP
        const otp = (0, email_1.generateOTP)();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.isEmailVerified = false;
        await user.save();
        // Send OTP email
        try {
            await (0, email_1.sendOTPEmail)(normalizedEmail, otp, trimmedFirstName);
        }
        catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Don't fail registration, user can resend OTP
        }
        // Return response - no token until email is verified
        res.status(201).json({
            message: 'Registration successful! Please check your email for the verification code.',
            requiresVerification: true,
            email: user.email,
            role: user.role
        });
    }
    catch (error) {
        // Handle MongoDB duplicate key error (race condition on rapid clicks)
        if (error?.code === 11000) {
            res.status(400).json({ message: 'An account with this email already exists' });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Registration error:', errorMessage);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
};
exports.register = register;
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Please provide email and password' });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = password.trim();
        if (!normalizedPassword) {
            res.status(400).json({ message: 'Please provide email and password' });
            return;
        }
        // If role is specified (user chose from role selection), find that specific account
        if (role) {
            const user = await User_1.default.findOne({ email: normalizedEmail, role }).select('+password');
            if (!user || !user.password) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
            let isMatch = false;
            try {
                isMatch = await user.matchPassword(normalizedPassword);
            }
            catch (passwordError) {
                console.error(`Password comparison failed for user ${user._id}:`, passwordError);
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
            if (!isMatch) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
                return;
            }
            if (!user.isEmailVerified && user.role !== 'admin') {
                const otp = (0, email_1.generateOTP)();
                const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                await User_1.default.updateOne({ _id: user._id }, { $set: { otp, otpExpires } });
                try {
                    await (0, email_1.sendOTPEmail)(user.email, otp, user.firstName || 'User');
                }
                catch { }
                res.status(403).json({
                    message: 'Email not verified. A new verification code has been sent to your email.',
                    requiresVerification: true, email: user.email, role: user.role
                });
                return;
            }
            if (!user.canLogin()) {
                res.status(403).json({ message: user.getApprovalMessage(), approvalStatus: user.approvalStatus, role: user.role });
                return;
            }
            res.json({ user: formatUser(user), token: generateToken(user._id, user.role) });
            return;
        }
        // Check for user — same email may have multiple role accounts
        const users = await User_1.default.find({ email: normalizedEmail }).select('+password');
        if (!users || users.length === 0) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        // Try password against each account to find matching roles
        const matchedUsers = [];
        for (const candidate of users) {
            if (!candidate.password)
                continue;
            try {
                const isMatch = await candidate.matchPassword(normalizedPassword);
                if (isMatch) {
                    matchedUsers.push(candidate);
                }
            }
            catch (passwordError) {
                console.error(`Skipping user ${candidate._id} during login because password comparison failed:`, passwordError);
            }
        }
        if (matchedUsers.length === 0) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        // If multiple roles matched the same password, ask user to choose
        if (matchedUsers.length > 1) {
            const roles = matchedUsers.map(u => ({
                role: u.role,
                approvalStatus: u.approvalStatus,
                isActive: u.isActive,
                isEmailVerified: u.isEmailVerified
            }));
            res.json({
                requiresRoleSelection: true,
                email: normalizedEmail,
                roles
            });
            return;
        }
        const user = matchedUsers[0];
        // Check if account is active
        if (!user.isActive) {
            res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
            return;
        }
        // Check if email is verified (skip for admin users — they are created via seed/DB)
        if (!user.isEmailVerified && user.role !== 'admin') {
            // Resend OTP automatically
            const otp = (0, email_1.generateOTP)();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            // Use updateOne to avoid Mongoose validation on potentially incomplete legacy documents
            await User_1.default.updateOne({ _id: user._id }, { $set: { otp, otpExpires } });
            try {
                await (0, email_1.sendOTPEmail)(user.email, otp, user.firstName || 'User');
            }
            catch (emailError) {
                console.error('Failed to resend OTP:', emailError);
            }
            res.status(403).json({
                message: 'Email not verified. A new verification code has been sent to your email.',
                requiresVerification: true,
                email: user.email,
                role: user.role
            });
            return;
        }
        // Check if user can login (approval check for sellers/mechanics)
        if (!user.canLogin()) {
            res.status(403).json({
                message: user.getApprovalMessage(),
                approvalStatus: user.approvalStatus,
                role: user.role
            });
            return;
        }
        res.json({
            user: formatUser(user),
            token: generateToken(user._id, user.role)
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
};
exports.login = login;
// @desc    Google Authentication (buyers only)
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            res.status(400).json({ message: 'Google credential is required' });
            return;
        }
        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: config_1.default.googleClientId
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, given_name, family_name, picture } = payload;
        if (!email) {
            res.status(400).json({ message: 'Email not provided by Google' });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        // Check if user exists (Google auth = buyer only)
        let user = await User_1.default.findOne({ $or: [{ googleId }, { email: normalizedEmail, role: 'buyer' }] });
        if (user) {
            // Update Google ID and avatar if not set
            const updateFields = {};
            if (!user.googleId)
                updateFields.googleId = googleId;
            if (picture && !user.avatar)
                updateFields.avatar = picture;
            if (Object.keys(updateFields).length > 0) {
                await User_1.default.updateOne({ _id: user._id }, { $set: updateFields });
                if (updateFields.googleId)
                    user.googleId = googleId;
                if (updateFields.avatar)
                    user.avatar = picture || null;
            }
            // Check if user can login
            if (!user.canLogin()) {
                res.status(403).json({
                    message: user.getApprovalMessage(),
                    approvalStatus: user.approvalStatus,
                    role: user.role
                });
                return;
            }
        }
        else {
            // Create new user as buyer (Google OAuth = buyer only)
            user = await User_1.default.create({
                firstName: given_name || 'User',
                lastName: family_name || '',
                email: normalizedEmail,
                googleId,
                avatar: picture,
                role: 'buyer'
            });
        }
        res.json({
            user: formatUser(user),
            token: generateToken(user._id, user.role)
        });
    }
    catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ message: 'Google authentication failed' });
    }
};
exports.googleAuth = googleAuth;
// @desc    Verify OTP for email verification
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { email, otp, role } = req.body;
        if (!email || !otp) {
            res.status(400).json({ message: 'Email and OTP are required' });
            return;
        }
        // Find the unverified user with this email (and optional role)
        const filter = { email: normalizeEmail(email), isEmailVerified: false };
        if (role)
            filter.role = role;
        const user = await User_1.default.findOne(filter).sort({ createdAt: -1 });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.isEmailVerified) {
            res.status(400).json({ message: 'Email is already verified' });
            return;
        }
        // Check OTP
        if (!user.otp || user.otp !== otp) {
            res.status(400).json({ message: 'Invalid verification code' });
            return;
        }
        // Check OTP expiration
        if (!user.otpExpires || user.otpExpires < new Date()) {
            res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
            return;
        }
        // Mark email as verified and clear OTP
        // Use updateOne to avoid Mongoose validation on potentially incomplete legacy documents
        await User_1.default.updateOne({ _id: user._id }, { $set: { isEmailVerified: true, otp: null, otpExpires: null } });
        user.isEmailVerified = true;
        user.otp = null;
        user.otpExpires = null;
        // Send welcome email
        try {
            await (0, email_1.sendWelcomeEmail)(user.email, user.firstName, user.role);
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }
        // If buyer (auto-approved), return token
        // If seller/mechanic (needs approval), return message
        const responseData = {
            message: user.getApprovalMessage(),
            user: formatUser(user),
            verified: true
        };
        if (user.canLogin()) {
            responseData.token = generateToken(user._id, user.role);
        }
        res.json(responseData);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.verifyOTP = verifyOTP;
// @desc    Resend OTP verification code
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }
        // Find the unverified user with this email (and optional role)
        const filter = { email: normalizeEmail(email), isEmailVerified: false };
        if (role)
            filter.role = role;
        const user = await User_1.default.findOne(filter).sort({ createdAt: -1 });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.isEmailVerified) {
            res.status(400).json({ message: 'Email is already verified' });
            return;
        }
        // Rate limiting: don't allow resend if OTP was sent less than 60 seconds ago
        if (user.otpExpires) {
            const otpCreatedAt = new Date(user.otpExpires.getTime() - 10 * 60 * 1000);
            const timeSince = Date.now() - otpCreatedAt.getTime();
            if (timeSince < 60 * 1000) {
                const waitSeconds = Math.ceil((60 * 1000 - timeSince) / 1000);
                res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting a new code.` });
                return;
            }
        }
        // Generate new OTP
        const otp = (0, email_1.generateOTP)();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        // Use updateOne to avoid Mongoose validation on potentially incomplete legacy documents
        await User_1.default.updateOne({ _id: user._id }, { $set: { otp, otpExpires } });
        // Send OTP email
        await (0, email_1.sendOTPEmail)(user.email, otp, user.firstName || 'User');
        res.json({ message: 'A new verification code has been sent to your email.' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.resendOTP = resendOTP;
// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(formatUser(user));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.getMe = getMe;
// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Fields that can be updated by the user
        const { firstName, lastName, phone, address, avatar, email } = req.body;
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (phone !== undefined)
            user.phone = phone;
        if (address !== undefined)
            user.address = address;
        if (avatar !== undefined)
            user.avatar = avatar;
        if (email !== undefined)
            user.email = email;
        // Role-specific fields
        if (user.role === 'seller') {
            const { shopName, shopDescription, shopLocation, sellerSpecializations, sellerBrands } = req.body;
            if (shopName)
                user.shopName = shopName;
            if (shopDescription !== undefined)
                user.shopDescription = shopDescription;
            if (shopLocation !== undefined)
                user.shopLocation = shopLocation;
            if (sellerSpecializations !== undefined)
                user.sellerSpecializations = Array.isArray(sellerSpecializations) ? sellerSpecializations : [];
            if (sellerBrands !== undefined)
                user.sellerBrands = Array.isArray(sellerBrands) ? sellerBrands : [];
        }
        if (user.role === 'mechanic') {
            const { specialization, experienceYears, workshopLocation, workshopName, servicesOffered, mechanicBrands } = req.body;
            if (specialization)
                user.specialization = specialization;
            if (experienceYears !== undefined)
                user.experienceYears = experienceYears;
            if (workshopLocation !== undefined)
                user.workshopLocation = workshopLocation;
            if (workshopName !== undefined)
                user.workshopName = workshopName;
            if (servicesOffered !== undefined)
                user.servicesOffered = Array.isArray(servicesOffered) ? servicesOffered : [];
            if (mechanicBrands !== undefined)
                user.mechanicBrands = Array.isArray(mechanicBrands) ? mechanicBrands : [];
        }
        if (user.role === 'delivery_agent') {
            const { vehicleType, vehicleNumber, licenseNumber, payoutMethod, payoutAccountName } = req.body;
            if (vehicleType !== undefined)
                user.vehicleType = vehicleType;
            if (vehicleNumber !== undefined)
                user.vehicleNumber = vehicleNumber;
            if (licenseNumber !== undefined)
                user.licenseNumber = licenseNumber;
            if (payoutMethod !== undefined)
                user.payoutMethod = payoutMethod;
            if (payoutAccountName !== undefined)
                user.payoutAccountName = payoutAccountName;
        }
        await user.save();
        res.json({
            message: 'Profile updated successfully',
            user: formatUser(user)
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.updateProfile = updateProfile;
// @desc    Upload avatar image
// @route   POST /api/auth/upload-avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        user.avatar = avatarUrl;
        await user.save();
        res.json({
            message: 'Avatar uploaded successfully',
            avatar: avatarUrl,
            user: formatUser(user),
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.uploadAvatar = uploadAvatar;
// @desc    Check approval status
// @route   GET /api/auth/approval-status
// @access  Public (by email query param)
const checkApprovalStatus = async (req, res) => {
    try {
        const email = req.query.email;
        const role = req.query.role;
        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }
        const filter = { email };
        if (role)
            filter.role = role;
        const user = await User_1.default.findOne(filter);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            role: user.role,
            approvalStatus: user.approvalStatus,
            canLogin: user.canLogin(),
            message: user.getApprovalMessage()
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.checkApprovalStatus = checkApprovalStatus;
// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Please provide current password and new password' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ message: 'New password must be at least 6 characters' });
            return;
        }
        // Get user with password
        const user = await User_1.default.findById(req.user._id).select('+password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // If user registered via Google only (no password set)
        if (!user.password) {
            res.status(400).json({ message: 'Your account uses Google sign-in. You cannot change password here.' });
            return;
        }
        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            res.status(401).json({ message: 'Current password is incorrect' });
            return;
        }
        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.changePassword = changePassword;
// @desc    Add a new role to existing email account
// @route   POST /api/auth/add-role
// @access  Private (authenticated user)
const addRole = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { role, password, shopName, shopDescription, shopLocation, specialization, experienceYears, workshopLocation, workshopName } = req.body;
        // Validate role
        const validRoles = ['buyer', 'seller', 'mechanic', 'delivery_agent'];
        if (!role || !validRoles.includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
            return;
        }
        if (!strongPasswordRegex.test(password || '')) {
            res.status(400).json({ message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character' });
            return;
        }
        // Validate role-specific required fields
        if (role === 'seller' && !shopName) {
            res.status(400).json({ message: 'Shop name is required for sellers' });
            return;
        }
        if (shopName && !businessNameRegex.test(shopName.trim())) {
            res.status(400).json({ message: 'Shop name may contain letters, numbers, spaces, apostrophes, hyphens, and periods only' });
            return;
        }
        if (role === 'mechanic' && !specialization) {
            res.status(400).json({ message: 'Specialization is required for mechanics' });
            return;
        }
        if (workshopName && !businessNameRegex.test(workshopName.trim())) {
            res.status(400).json({ message: 'Workshop name may contain letters, numbers, spaces, apostrophes, hyphens, and periods only' });
            return;
        }
        const currentUser = await User_1.default.findById(req.user._id);
        if (!currentUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Check if this email already has this role
        const existingRole = await User_1.default.findOne({ email: currentUser.email, role });
        if (existingRole) {
            res.status(400).json({ message: `You already have a ${role} account` });
            return;
        }
        // Build new role account data
        const userData = {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
            password,
            phone: currentUser.phone,
            role,
            isEmailVerified: true // Already verified via original account
        };
        if (role === 'seller') {
            userData.shopName = shopName;
            userData.shopDescription = shopDescription;
            userData.shopLocation = shopLocation;
        }
        if (role === 'mechanic') {
            userData.specialization = specialization;
            userData.experienceYears = experienceYears;
            userData.workshopLocation = workshopLocation;
            userData.workshopName = workshopName;
        }
        const newUser = await User_1.default.create(userData);
        res.status(201).json({
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} role added successfully!${role !== 'buyer' ? ' It is pending admin approval.' : ''}`,
            user: formatUser(newUser)
        });
    }
    catch (error) {
        if (error?.code === 11000) {
            res.status(400).json({ message: 'You already have this role' });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.addRole = addRole;
// @desc    Get all roles for the current user's email
// @route   GET /api/auth/my-roles
// @access  Private
const getMyRoles = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const users = await User_1.default.find({ email: req.user.email });
        const roles = users.map(u => ({
            role: u.role,
            approvalStatus: u.approvalStatus,
            isActive: u.isActive,
            isEmailVerified: u.isEmailVerified,
            createdAt: u.createdAt
        }));
        res.json({ email: req.user.email, roles });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: errorMessage });
    }
};
exports.getMyRoles = getMyRoles;
