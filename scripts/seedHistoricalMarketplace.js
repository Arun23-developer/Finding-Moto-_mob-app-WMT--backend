"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = __importDefault(require("../src/config"));
const User_1 = __importDefault(require("../src/models/User"));
const Product_1 = __importDefault(require("../src/models/Product"));
const Order_1 = __importDefault(require("../src/models/Order"));
const Delivery_1 = __importDefault(require("../src/models/Delivery"));
const Review_1 = __importDefault(require("../src/models/Review"));
dotenv_1.default.config();
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const HISTORY_MARKER = '[HISTORICAL-SEED]';
const PAYMENT_METHODS = ['Cash on Delivery', 'Card Payment', 'Bank Transfer', 'Mobile Wallet'];
const ORDER_PATTERNS = [
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery', 'delivered', 'completed'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery', 'delivered', 'completed'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery', 'delivered'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery', 'delivered'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery'],
    ['pending', 'awaiting_seller_confirmation', 'cancelled'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'processing', 'ready_for_dispatch', 'pickup_assigned', 'picked_up', 'out_for_delivery', 'delivery_failed'],
    ['pending', 'awaiting_seller_confirmation', 'confirmed', 'cancelled', 'refunded'],
];
const createStatusHistory = (statuses, startAt, stepHours) => {
    return statuses.map((status, index) => ({
        status,
        changedAt: new Date(startAt.getTime() + index * stepHours * HOUR_MS),
        note: index === 0 ? 'Historical marketplace seed' : undefined,
    }));
};
const getDeliveryTimeline = (orderStatus) => {
    switch (orderStatus) {
        case 'completed':
        case 'delivered':
            return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
        case 'out_for_delivery':
            return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];
        case 'picked_up':
            return ['ASSIGNED', 'PICKED_UP'];
        case 'delivery_failed':
            return ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'FAILED'];
        case 'ready_for_dispatch':
        case 'processing':
        case 'confirmed':
        case 'awaiting_seller_confirmation':
        case 'pending':
        case 'cancelled':
        case 'refunded':
        case 'shipped':
        case 'pickup_assigned':
        default:
            return ['ASSIGNED'];
    }
};
const createDeliveryHistory = (statuses, startAt) => {
    return statuses.map((status, index) => ({
        status,
        changedAt: new Date(startAt.getTime() + index * 12 * HOUR_MS),
    }));
};
const finalOrderStatusForIndex = (orderIndex) => {
    return ORDER_PATTERNS[orderIndex % ORDER_PATTERNS.length][ORDER_PATTERNS[orderIndex % ORDER_PATTERNS.length].length - 1];
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPastDate = (minDaysAgo, maxDaysAgo) => {
    const offsetDays = randomInt(minDaysAgo, maxDaysAgo);
    const offsetHours = randomInt(0, 23);
    const offsetMinutes = randomInt(0, 59);
    return new Date(Date.now() - offsetDays * DAY_MS - offsetHours * HOUR_MS - offsetMinutes * 60 * 1000);
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const seedHistoricalMarketplace = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        const [buyersRaw, sellersRaw, agentsRaw, productsRaw] = await Promise.all([
            User_1.default.find({ role: 'buyer', isActive: true, isEmailVerified: true }).select('_id email address').lean(),
            User_1.default.find({ role: 'seller', approvalStatus: 'approved', isActive: true }).select('_id email shopName').lean(),
            User_1.default.find({
                role: 'delivery_agent',
                approvalStatus: 'approved',
                isActive: true,
                agent_status: 'ENABLED',
            })
                .select('_id email vehicleType')
                .lean(),
            Product_1.default.find({
                status: 'active',
                productStatus: 'ENABLED',
                seller: { $exists: true },
            })
                .select('_id name price images seller')
                .sort({ createdAt: 1 })
                .lean(),
        ]);
        const buyers = buyersRaw;
        const sellers = sellersRaw;
        const agents = agentsRaw;
        const products = productsRaw;
        if (buyers.length === 0 || sellers.length === 0 || agents.length === 0 || products.length === 0) {
            throw new Error('Missing buyers, sellers, delivery agents, or products. Run the base seed scripts first.');
        }
        console.log(`👥 Buyers: ${buyers.length}`);
        console.log(`🏪 Sellers: ${sellers.length}`);
        console.log(`🚚 Delivery agents: ${agents.length}`);
        console.log(`🧩 Products: ${products.length}\n`);
        const previousOrders = await Order_1.default.find({ notes: { $regex: `^${escapeRegex(HISTORY_MARKER)}` } }).select('_id').lean();
        const previousOrderIds = previousOrders.map((order) => order._id);
        if (previousOrderIds.length > 0) {
            await Delivery_1.default.deleteMany({ orderId: { $in: previousOrderIds } });
            await Review_1.default.deleteMany({ comment: { $regex: `^${escapeRegex(HISTORY_MARKER)}` } });
            await Order_1.default.deleteMany({ _id: { $in: previousOrderIds } });
            console.log(`🧹 Cleared ${previousOrderIds.length} previous historical orders, deliveries, and reviews\n`);
        }
        const orderDocuments = [];
        const deliveryDocuments = [];
        const reviewDocuments = [];
        const targetOrders = 1000;
        const ordersPerProduct = Math.floor(targetOrders / products.length);
        const reviewComments = [
            'Excellent quality and fast delivery.',
            'Fits perfectly and works as expected.',
            'Good value for the price.',
            'Packaging was secure and the item arrived on time.',
            'Very satisfied with the product and seller service.',
            'Trusted part, no issues after installation.',
            'Item matched the description exactly.',
            'Solid aftermarket quality for daily riding.',
        ];
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            const product = products[productIndex];
            const sellerId = product.seller;
            for (let orderIndex = 0; orderIndex < ordersPerProduct; orderIndex++) {
                const buyer = buyers[(productIndex * ordersPerProduct + orderIndex) % buyers.length];
                const agent = agents[(productIndex + orderIndex) % agents.length];
                const orderStatus = finalOrderStatusForIndex(orderIndex);
                const orderCreatedAt = randomPastDate(90 + productIndex, 540 - orderIndex);
                const orderTimeline = createStatusHistory(ORDER_PATTERNS[orderIndex % ORDER_PATTERNS.length], orderCreatedAt, 18);
                const orderFinalAt = orderTimeline[orderTimeline.length - 1]?.changedAt ?? orderCreatedAt;
                const deliveryTimelineStatuses = getDeliveryTimeline(orderStatus);
                const deliveryCreatedAt = new Date(orderCreatedAt.getTime() + 24 * HOUR_MS);
                const deliveryTimeline = createDeliveryHistory(deliveryTimelineStatuses, deliveryCreatedAt);
                const deliveryFinalAt = deliveryTimeline[deliveryTimeline.length - 1]?.changedAt ?? deliveryCreatedAt;
                const quantity = orderIndex < 2 ? 2 : 1;
                const lineTotal = product.price * quantity;
                const orderDocument = {
                    buyer: buyer._id,
                    seller: sellerId,
                    order_type: 'product',
                    items: [
                        {
                            product: product._id,
                            name: product.name,
                            price: product.price,
                            qty: quantity,
                            image: product.images?.[0] || '',
                        },
                    ],
                    totalAmount: lineTotal,
                    status: orderStatus,
                    shippingAddress: buyer.address || `Sample Address ${productIndex + 1}, Sri Lanka`,
                    paymentMethod: PAYMENT_METHODS[(productIndex + orderIndex) % PAYMENT_METHODS.length],
                    notes: `${HISTORY_MARKER} product-order-${String(productIndex + 1).padStart(3, '0')}-${String(orderIndex + 1).padStart(2, '0')}`,
                    statusHistory: orderTimeline,
                    createdAt: orderCreatedAt,
                    updatedAt: orderFinalAt,
                };
                orderDocuments.push(orderDocument);
                deliveryDocuments.push({
                    orderId: undefined,
                    agentId: agent._id,
                    status: deliveryTimelineStatuses[deliveryTimelineStatuses.length - 1],
                    statusHistory: deliveryTimeline,
                    deliveredAt: deliveryTimelineStatuses.includes('DELIVERED') ? deliveryFinalAt : null,
                    createdAt: deliveryCreatedAt,
                    updatedAt: deliveryFinalAt,
                });
                if (orderStatus === 'completed' || orderStatus === 'delivered') {
                    const reviewDate = new Date(orderFinalAt.getTime() + randomInt(1, 10) * DAY_MS);
                    reviewDocuments.push({
                        productId: product._id,
                        sellerId,
                        buyer: buyer._id,
                        rating: orderIndex === 0 ? 5 : orderIndex === 1 ? 4 : randomInt(4, 5),
                        comment: `${HISTORY_MARKER} ${reviewComments[(productIndex + orderIndex) % reviewComments.length]}`,
                        createdAt: reviewDate,
                        updatedAt: reviewDate,
                    });
                }
            }
        }
        const insertedOrders = await Order_1.default.collection.insertMany(orderDocuments);
        const insertedOrderIds = Object.values(insertedOrders.insertedIds).map((value) => value);
        for (let i = 0; i < deliveryDocuments.length; i++) {
            deliveryDocuments[i].orderId = insertedOrderIds[i];
        }
        await Delivery_1.default.collection.insertMany(deliveryDocuments);
        await Review_1.default.collection.insertMany(reviewDocuments);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              HISTORICAL MARKETPLACE DATA CREATED');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Orders created: ${orderDocuments.length}`);
        console.log(`✓ Deliveries created: ${deliveryDocuments.length}`);
        console.log(`✓ Reviews created: ${reviewDocuments.length}`);
        console.log(`✓ Products used: ${products.length}`);
        console.log(`✓ Buyers used: ${buyers.length}`);
        console.log(`✓ Sellers used: ${sellers.length}`);
        console.log(`✓ Delivery agents used: ${agents.length}\n`);
        console.log('Highlights:');
        console.log('  • 1000 historical product orders');
        console.log('  • Past timestamps spread across older months');
        console.log('  • Delivery tracking history per order');
        console.log('  • Product reviews generated from real buyers');
        console.log('  • Uses existing database users and products');
        await mongoose_1.default.disconnect();
        console.log('\nDone.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding historical marketplace data:', error);
        process.exit(1);
    }
};
seedHistoricalMarketplace();
