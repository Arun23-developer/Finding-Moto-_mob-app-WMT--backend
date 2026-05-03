const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Connection
 * Establishes connection to MongoDB Atlas or local instance
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finding_moto';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes on connection
    await createIndexes();
    
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Create MongoDB Indexes for Performance
 */
const createIndexes = async () => {
  try {
    // User indexes
    const userCollection = mongoose.connection.collection('users');
    await userCollection.createIndex({ email: 1 }, { unique: true });
    await userCollection.createIndex({ phone: 1 }, { unique: true });
    await userCollection.createIndex({ role: 1 });
    await userCollection.createIndex({ status: 1 });

    // SparePart indexes
    const sparePartCollection = mongoose.connection.collection('spareparts');
    await sparePartCollection.createIndex({ name: 'text', description: 'text' });
    await sparePartCollection.createIndex({ sellerId: 1 });
    await sparePartCollection.createIndex({ category: 1, subcategory: 1 });
    await sparePartCollection.createIndex({ price: 1 });
    await sparePartCollection.createIndex({ createdAt: -1 });

    // Order indexes
    const orderCollection = mongoose.connection.collection('orders');
    await orderCollection.createIndex({ buyerId: 1 });
    await orderCollection.createIndex({ sellerId: 1 });
    await orderCollection.createIndex({ status: 1 });
    await orderCollection.createIndex({ createdAt: -1 });

    // Service indexes
    const serviceCollection = mongoose.connection.collection('services');
    await serviceCollection.createIndex({ mechanicId: 1 });
    await serviceCollection.createIndex({ category: 1 });
    await serviceCollection.createIndex({ createdAt: -1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error(`Index creation error: ${error.message}`);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error(`MongoDB Disconnection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
