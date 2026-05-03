require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./src/config/db');
const { errorMiddleware, notFoundMiddleware } = require('./src/middleware/errorMiddleware');
const logger = require('./src/utils/logger');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
app.use(
  rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { success: false, message: 'Too many requests, please try again later.' }
  })
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Attach io to requests
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Finding Moto API is running', env: process.env.NODE_ENV });
});


app.get('/', (_req, res) => {
  res.send('API is running...');
});

// API Routes (add route files here as they are created)
// app.use('/api/v1/auth',      require('./src/routes/auth.routes'));
// app.use('/api/v1/users',     require('./src/routes/user.routes'));
// app.use('/api/v1/spareparts',require('./src/routes/sparePart.routes'));
// app.use('/api/v1/services',  require('./src/routes/service.routes'));
// app.use('/api/v1/orders',    require('./src/routes/order.routes'));
// app.use('/api/v1/cart',      require('./src/routes/cart.routes'));
// app.use('/api/v1/payments',  require('./src/routes/payment.routes'));
// app.use('/api/v1/delivery',  require('./src/routes/delivery.routes'));
// app.use('/api/v1/reviews',   require('./src/routes/review.routes'));
// app.use('/api/v1/notifications', require('./src/routes/notification.routes'));

// 404 & error handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Socket.io connection
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_room', (room) => socket.join(room));
  socket.on('leave_room', (room) => socket.leave(room));

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const startServer = async () => {
  await connectDB();

  server.listen(PORT, HOST, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on http://${HOST}:${PORT}`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

startServer();

module.exports = { app, io };
