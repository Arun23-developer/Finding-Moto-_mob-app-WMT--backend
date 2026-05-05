"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
let connecting = false;
let retryTimer = null;
const scheduleRetry = () => {
    if (retryTimer)
        return;
    retryTimer = setTimeout(() => {
        retryTimer = null;
        void connectDB();
    }, 5000);
};
const connectDB = async () => {
    if (connecting)
        return;
    connecting = true;
    try {
        mongoose_1.default.set('bufferCommands', false);
        mongoose_1.default.connection.removeAllListeners('disconnected');
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Retrying connection...');
            scheduleRetry();
        });
        const conn = await mongoose_1.default.connect(config_1.default.mongoURI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        // Migrate: drop old unique index on email alone (now compound email+role)
        try {
            const collection = conn.connection.collection('users');
            const indexes = await collection.indexes();
            const oldEmailIndex = indexes.find((idx) => idx.key?.email && !idx.key?.role && idx.unique);
            if (oldEmailIndex && oldEmailIndex.name) {
                await collection.dropIndex(oldEmailIndex.name);
                console.log('Dropped old unique email index (migrated to email+role)');
            }
        }
        catch (indexErr) {
            // Index may already be gone — ignore
            if (indexErr?.code !== 27) {
                console.warn('Index migration note:', indexErr?.message);
            }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`MongoDB connection failed: ${errorMessage}`);
        scheduleRetry();
    }
    finally {
        connecting = false;
    }
};
exports.default = connectDB;
