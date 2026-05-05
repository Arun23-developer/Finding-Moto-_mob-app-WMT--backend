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
const setApprovalStatus = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        // Set all sellers to pending
        const sellerResult = await User_1.default.updateMany({ role: 'seller' }, {
            $set: {
                approvalStatus: 'pending',
                approvedAt: null
            }
        });
        // Set all mechanics to pending
        const mechanicResult = await User_1.default.updateMany({ role: 'mechanic' }, {
            $set: {
                approvalStatus: 'pending',
                approvedAt: null
            }
        });
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              APPROVAL STATUS UPDATED TO PENDING');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Updated ${sellerResult.modifiedCount} sellers to PENDING`);
        console.log(`✓ Updated ${mechanicResult.modifiedCount} mechanics to PENDING\n`);
        console.log('───────────────────────────────────────────────────────────────');
        console.log('Sellers now require admin approval before they can operate.');
        console.log('Mechanics now require admin approval before they can operate.\n');
        console.log('To approve them, run: npm run approval:approve\n');
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error updating approval status:', error);
        process.exit(1);
    }
};
setApprovalStatus();
