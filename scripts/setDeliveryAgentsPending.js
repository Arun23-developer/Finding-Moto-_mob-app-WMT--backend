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
const setDeliveryAgentsPending = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        const result = await User_1.default.updateMany({ role: 'delivery_agent' }, {
            $set: {
                approvalStatus: 'pending',
                approvedAt: null,
                agent_status: 'DISABLED'
            }
        });
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('           DELIVERY AGENTS - APPROVAL SET TO PENDING');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Updated ${result.modifiedCount} delivery agents to PENDING\n`);
        console.log('───────────────────────────────────────────────────────────────');
        console.log('Delivery agents now:');
        console.log('  • Require admin approval');
        console.log('  • Have agent_status: DISABLED');
        console.log('  • Cannot accept deliveries\n');
        console.log('To approve them, run: npm run approval:approve-agents\n');
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error updating delivery agents:', error);
        process.exit(1);
    }
};
setDeliveryAgentsPending();
