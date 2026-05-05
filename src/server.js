"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const db_1 = __importDefault(require("./utils/db"));
const socket_1 = require("./utils/socket");
// Connect to database
(0, db_1.default)();
const PORT = config_1.default.port;
const httpServer = (0, http_1.createServer)(app_1.default);
// Setup Socket.IO
(0, socket_1.setupSocket)(httpServer);
const server = httpServer.listen(PORT, () => {
    console.log(`Server running in ${config_1.default.nodeEnv} mode on port ${PORT}`);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});
