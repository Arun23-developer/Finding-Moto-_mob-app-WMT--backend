"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../src/models/User"));
const config_1 = __importDefault(require("../src/config"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('MongoDB Connected');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@findingmoto.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
        // Check if admin already exists
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists:');
            console.log(`  Email: ${existingAdmin.email}`);
            console.log(`  Role: ${existingAdmin.role}`);
            console.log(`  Active: ${existingAdmin.isActive}`);
            console.log(`  Email Verified: ${existingAdmin.isEmailVerified}`);
            // Ensure the existing admin has correct flags and reset password
            const adminUser = await User_1.default.findById(existingAdmin._id).select('+password');
            if (adminUser) {
                adminUser.isEmailVerified = true;
                adminUser.isActive = true;
                adminUser.role = 'admin';
                adminUser.approvalStatus = 'approved';
                adminUser.password = adminPassword; // Will be hashed by pre-save hook
                await adminUser.save();
                console.log('Updated admin flags and reset password.');
            }
        }
        else {
            // Create admin user
            const admin = await User_1.default.create({
                firstName: 'Admin',
                lastName: 'User',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                isEmailVerified: true,
                isActive: true,
                approvalStatus: 'approved'
            });
            console.log('Admin user created successfully!');
            console.log(`  Email: ${admin.email}`);
            console.log(`  Password: ${adminPassword} (hashed in DB)`);
            console.log(`  Role: ${admin.role}`);
        }
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};
seedAdmin();
