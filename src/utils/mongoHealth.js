"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMongoDBDetails = exports.checkMongoDBConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Check MongoDB connection status
 * readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const checkMongoDBConnection = async () => {
    try {
        const readyState = mongoose_1.default.connection.readyState;
        const host = mongoose_1.default.connection.host;
        // Attempt to ping the database if connected
        if (readyState === 1) {
            try {
                await mongoose_1.default.connection.db?.admin().ping();
                return {
                    connected: true,
                    readyState,
                    host,
                    message: 'MongoDB is connected and responding',
                };
            }
            catch (pingErr) {
                return {
                    connected: false,
                    readyState,
                    host,
                    message: 'MongoDB connection exists but ping failed',
                };
            }
        }
        // Map readyState to status
        const stateMessages = {
            0: 'MongoDB is disconnected',
            1: 'MongoDB is connected',
            2: 'MongoDB is connecting',
            3: 'MongoDB is disconnecting',
        };
        return {
            connected: false,
            readyState,
            host,
            message: stateMessages[readyState] || 'Unknown connection state',
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            connected: false,
            readyState: mongoose_1.default.connection.readyState,
            message: `MongoDB health check failed: ${errorMessage}`,
        };
    }
};
exports.checkMongoDBConnection = checkMongoDBConnection;
/**
 * Get verbose MongoDB connection details
 */
const getMongoDBDetails = async () => {
    const health = await (0, exports.checkMongoDBConnection)();
    const conn = mongoose_1.default.connection;
    return {
        ...health,
        uri: process.env.MONGO_URI ? 'configured' : 'not configured',
        database: conn.db?.databaseName,
        timestamp: new Date().toISOString(),
    };
};
exports.getMongoDBDetails = getMongoDBDetails;
