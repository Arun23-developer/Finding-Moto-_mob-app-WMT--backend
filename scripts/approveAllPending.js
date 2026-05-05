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
const approveAllPending = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        const now = new Date();
        // Approve all pending sellers
        const sellerResult = await User_1.default.updateMany({ role: 'seller', approvalStatus: 'pending' }, {
            $set: {
                approvalStatus: 'approved',
                approvedAt: now
            }
        });
        // Approve all pending mechanics
        const mechanicResult = await User_1.default.updateMany({ role: 'mechanic', approvalStatus: 'pending' }, {
            $set: {
                approvalStatus: 'approved',
                approvedAt: now
            }
        });
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('          APPROVAL STATUS UPDATED TO APPROVED');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Approved ${sellerResult.modifiedCount} sellers`);
        console.log(`✓ Approved ${mechanicResult.modifiedCount} mechanics\n`);
        console.log('───────────────────────────────────────────────────────────────');
        console.log('All approved sellers can now list products.');
        console.log('All approved mechanics can now offer services.\n');
        // Show stats
        const totalSellers = await User_1.default.countDocuments({ role: 'seller' });
        const approvedSellers = await User_1.default.countDocuments({
            role: 'seller',
            approvalStatus: 'approved'
        });
        const totalMechanics = await User_1.default.countDocuments({ role: 'mechanic' });
        const approvedMechanics = await User_1.default.countDocuments({
            role: 'mechanic',
            approvalStatus: 'approved'
        });
        console.log('📊 CURRENT STATUS:');
        console.log(`   Sellers: ${approvedSellers}/${totalSellers} approved`);
        console.log(`   Mechanics: ${approvedMechanics}/${totalMechanics} approved\n`);
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error approving vendors:', error);
        process.exit(1);
    }
};
approveAllPending();
