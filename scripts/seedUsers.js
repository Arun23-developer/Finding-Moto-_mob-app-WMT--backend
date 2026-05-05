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
const sampleUsers = [
    // ─── Sellers ──────────────────────────────────────────────────────
    {
        firstName: 'Nanthujan',
        lastName: 'Sivapalan',
        email: 'nanthujan0@gmail.com',
        password: 'seller123',
        phone: '+94 77 912 3488',
        role: 'seller',
        isEmailVerified: true,
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        shopName: 'Nanthu Moto Garage Supply',
        shopDescription: 'Curated motorcycle spare parts and performance accessories inspired by popular online moto catalogs and rider communities.',
        shopLocation: 'Stanley Road, Jaffna',
    },
    {
        firstName: 'Nimal',
        lastName: 'Silva',
        email: 'seller2@gmail.com',
        password: 'seller123',
        phone: '+94 71 234 5678',
        role: 'seller',
        isEmailVerified: true,
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        shopName: 'Silva Motors & Parts',
        shopDescription: 'Authorized dealer for Honda, Toyota, and Suzuki spare parts. Genuine and aftermarket parts available.',
        shopLocation: '12/B, Kandy Road, Peradeniya',
    },
    // ─── Mechanics ────────────────────────────────────────────────────
    {
        firstName: 'P. Saravanappiriyan',
        lastName: 'Thiruchelvam',
        email: 'psaravanappiriyan@gmail.com',
        password: 'mechanic123',
        phone: '+94 76 398 1174',
        role: 'mechanic',
        isEmailVerified: true,
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        specialization: 'Engine Overhaul & Performance Tuning',
        experienceYears: 11,
        workshopName: 'Saravan Moto Works',
        workshopLocation: 'Kopay, Jaffna',
    },
    {
        firstName: 'Nanthujan',
        lastName: 'Sivapalan',
        email: 'nanthujan0@gmail.com',
        password: 'mechanic123',
        phone: '+94 77 912 3488',
        role: 'mechanic',
        isEmailVerified: true,
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        specialization: 'Electrical, Sensors & Diagnostics',
        experienceYears: 9,
        workshopName: 'Nanthu Bike Diagnostics',
        workshopLocation: 'Stanley Road, Jaffna',
    },
];
const seedUsers = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('MongoDB Connected');
        for (const userData of sampleUsers) {
            const existing = await User_1.default.findOne({ email: userData.email, role: userData.role });
            if (existing) {
                console.log(`✓ Already exists: ${existing.email} (${existing.role})`);
            }
            else {
                const user = await User_1.default.create(userData);
                // Force approval status to 'approved' since pre-save hook sets it to 'pending'
                await User_1.default.updateOne({ _id: user._id }, { $set: { approvalStatus: 'approved', approvedAt: new Date() } });
                console.log(`✓ Created: ${user.email} (${user.role})`);
            }
        }
        console.log('\n── Sample Credentials ──────────────────────');
        console.log('Seller 1:   nanthujan0@gmail.com / seller123');
        console.log('Seller 2:   seller2@gmail.com   / seller123');
        console.log('Mechanic 1: psaravanappiriyan@gmail.com / mechanic123');
        console.log('Mechanic 2: nanthujan0@gmail.com / mechanic123');
        console.log('────────────────────────────────────────────\n');
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};
seedUsers();
