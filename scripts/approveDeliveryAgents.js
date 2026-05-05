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
const approveDeliveryAgents = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        const now = new Date();
        const result = await User_1.default.updateMany({ role: 'delivery_agent', approvalStatus: 'pending' }, {
            $set: {
                approvalStatus: 'approved',
                approvedAt: now,
                agent_status: 'ENABLED'
            }
        });
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('         DELIVERY AGENTS - APPROVAL SET TO APPROVED');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Approved ${result.modifiedCount} delivery agents\n`);
        // Show stats
        const totalAgents = await User_1.default.countDocuments({ role: 'delivery_agent' });
        const approvedAgents = await User_1.default.countDocuments({
            role: 'delivery_agent',
            approvalStatus: 'approved'
        });
        const enabledAgents = await User_1.default.countDocuments({
            role: 'delivery_agent',
            agent_status: 'ENABLED'
        });
        console.log('───────────────────────────────────────────────────────────────');
        console.log('Delivery agents now:');
        console.log('  • Are approved');
        console.log('  • Have agent_status: ENABLED');
        console.log('  • Can accept deliveries\n');
        console.log('📊 DELIVERY AGENT STATUS:');
        console.log(`   Total Agents: ${totalAgents}`);
        console.log(`   Approved: ${approvedAgents}/${totalAgents}`);
        console.log(`   Enabled: ${enabledAgents}/${totalAgents}\n`);
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error approving delivery agents:', error);
        process.exit(1);
    }
};
approveDeliveryAgents();
