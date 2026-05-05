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
const vehicleTypes = ['Motorcycle', 'Bicycle', 'Scooter', 'Car', 'Van'];
const payoutMethods = ['Bank Transfer', 'Mobile Money', 'Cash', 'e-Wallet'];
const generateVehicleNumber = (index) => {
    const prefix = ['WP', 'CP', 'EP', 'NP', 'SP'][index] || 'WP';
    const number = String(1000 + index).padStart(4, '0');
    return `${prefix}-${number}`;
};
const generateLicenseNumber = (index) => {
    const year = 2020 + index;
    const number = String(10000 + index * 1000).padStart(5, '0');
    return `DL-${year}-${number}`;
};
const seedDeliveryAgents = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        console.log('📋 Creating 5 Delivery Agents...');
        const credentials = [];
        for (let i = 0; i < 5; i++) {
            const email = `deliveryagent${i + 1}@samplemail.com`;
            const password = 'DeliveryAgent@123';
            const existing = await User_1.default.findOne({ email, role: 'delivery_agent' });
            if (!existing) {
                await User_1.default.create({
                    firstName: `Agent`,
                    lastName: `Delivery${i + 1}`,
                    email,
                    password,
                    phone: `+94 77 ${String(1000000 + i * 100000).slice(-7)}`,
                    role: 'delivery_agent',
                    isEmailVerified: true,
                    isActive: true,
                    approvalStatus: 'approved',
                    approvedAt: new Date(),
                    vehicleType: vehicleTypes[i],
                    vehicleNumber: generateVehicleNumber(i),
                    licenseNumber: generateLicenseNumber(i),
                    payoutMethod: payoutMethods[i],
                    payoutAccountName: `Agent Delivery ${i + 1}`,
                    agent_status: 'ENABLED',
                    work_status: 'AVAILABLE'
                });
                console.log(`✓ Created Delivery Agent ${i + 1}: ${email}`);
                credentials.push({ email, password });
            }
            else {
                console.log(`✓ Delivery Agent ${i + 1} already exists: ${email}`);
                credentials.push({ email, password });
            }
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                 DELIVERY AGENTS CREATED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('🚚 DELIVERY AGENT ACCOUNTS (5 agents):\n');
        credentials.forEach((cred, idx) => {
            console.log(`  Agent ${idx + 1}:`);
            console.log(`    Email:    ${cred.email}`);
            console.log(`    Password: ${cred.password}`);
            console.log(`    Vehicle:  ${vehicleTypes[idx]}`);
            console.log(`    Status:   APPROVED & ENABLED\n`);
        });
        console.log('───────────────────────────────────────────────────────────────');
        console.log('All delivery agents are:');
        console.log('  ✅ Pre-approved');
        console.log('  ✅ Email verified');
        console.log('  ✅ ENABLED status');
        console.log('  ✅ Ready to accept deliveries\n');
        // Show overall stats
        const totalDeliveryAgents = await User_1.default.countDocuments({ role: 'delivery_agent' });
        const approvedAgents = await User_1.default.countDocuments({
            role: 'delivery_agent',
            approvalStatus: 'approved'
        });
        console.log('📊 CURRENT DATABASE STATUS:');
        console.log(`   Delivery Agents: ${approvedAgents}/${totalDeliveryAgents} approved\n`);
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding delivery agents:', error);
        process.exit(1);
    }
};
seedDeliveryAgents();
