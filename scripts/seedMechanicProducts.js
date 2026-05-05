"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Product_1 = __importDefault(require("../src/models/Product"));
const User_1 = __importDefault(require("../src/models/User"));
const config_1 = __importDefault(require("../src/config"));
dotenv_1.default.config();
const MECHANIC_EMAIL = 'mechanic@gmail.com';
const MECHANIC_PASSWORD = 'mechanic123';
const SAMPLE_PRODUCTS = [
    {
        name: 'NGK Iridium Spark Plug Set',
        description: 'Premium iridium spark plugs for smoother ignition and better fuel efficiency in commuter and sport motorcycles.',
        category: 'engine_system/spark_plug',
        brand: 'NGK',
        price: 6800,
        originalPrice: 7600,
        stock: 24,
        sku: 'MEC-SP-001',
        images: [
            'https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Castrol Power1 Engine Oil 10W-40',
        description: 'Synthetic blend engine oil for high-temperature protection and cleaner engine internals.',
        category: 'engine_system',
        brand: 'Castrol',
        price: 4200,
        originalPrice: 4900,
        stock: 40,
        sku: 'MEC-EO-002',
        images: [
            'https://images.pexels.com/photos/2393821/pexels-photo-2393821.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/18296/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Brembo Front Brake Pad Kit',
        description: 'Ceramic brake pads with reduced fade and consistent braking response for daily riding.',
        category: 'brake_system/brake_pad',
        brand: 'Brembo',
        price: 9500,
        originalPrice: 10900,
        stock: 18,
        sku: 'MEC-BP-003',
        images: [
            'https://images.pexels.com/photos/2116469/pexels-photo-2116469.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/2393819/pexels-photo-2393819.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'DID Heavy Duty Drive Chain 428H',
        description: 'Long-wear chain built for mixed city and highway riding with anti-corrosion coating.',
        category: 'transmission_system/drive_chain',
        brand: 'DID',
        price: 12600,
        originalPrice: 14200,
        stock: 16,
        sku: 'MEC-DC-004',
        images: [
            'https://images.pexels.com/photos/2549941/pexels-photo-2549941.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/1719648/pexels-photo-1719648.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Yuasa 12V Maintenance-Free Battery',
        description: 'Reliable cold starts and stable voltage output for bikes with extra electrical accessories.',
        category: 'electrical_system/battery',
        brand: 'Yuasa',
        price: 19800,
        originalPrice: 21500,
        stock: 12,
        sku: 'MEC-BT-005',
        images: [
            'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/1715192/pexels-photo-1715192.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Bosch LED Headlight Assembly',
        description: 'High-visibility LED headlight conversion kit with low power consumption and sharp beam pattern.',
        category: 'electrical_system/headlight',
        brand: 'Bosch',
        price: 17500,
        originalPrice: 19200,
        stock: 14,
        sku: 'MEC-HL-006',
        images: [
            'https://images.pexels.com/photos/163210/motorcycle-race-helmets-pilots-163210.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Fork Oil Seal and Dust Cover Set',
        description: 'Front suspension service kit designed to stop leaks and restore smooth fork movement.',
        category: 'suspension_system/front_fork',
        brand: 'SKF',
        price: 7200,
        originalPrice: 8500,
        stock: 22,
        sku: 'MEC-FK-007',
        images: [
            'https://images.pexels.com/photos/1119796/pexels-photo-1119796.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/13861/IMG_3496bfree.jpg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
    {
        name: 'Performance Air Filter Element',
        description: 'Washable high-flow air filter to improve throttle response and engine breathing.',
        category: 'fuel_system/fuel_filter',
        brand: 'K&N',
        price: 8600,
        originalPrice: 9400,
        stock: 20,
        sku: 'MEC-AF-008',
        images: [
            'https://images.pexels.com/photos/1309772/pexels-photo-1309772.jpeg?auto=compress&cs=tinysrgb&w=1200',
            'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
    },
];
async function ensureMechanicAccount() {
    let mechanic = await User_1.default.findOne({ email: MECHANIC_EMAIL, role: 'mechanic' }).select('+password');
    if (!mechanic) {
        mechanic = await User_1.default.create({
            firstName: 'Sample',
            lastName: 'Mechanic',
            email: MECHANIC_EMAIL,
            password: MECHANIC_PASSWORD,
            phone: '+94 77 700 1122',
            role: 'mechanic',
            isEmailVerified: true,
            isActive: true,
            approvalStatus: 'approved',
            approvedAt: new Date(),
            specialization: 'Engine, Electrical and Brake Systems',
            experienceYears: 8,
            workshopName: 'Mechanic Sample Garage',
            workshopLocation: 'Jaffna',
        });
        await User_1.default.updateOne({ _id: mechanic._id }, {
            $set: {
                approvalStatus: 'approved',
                approvedAt: new Date(),
                isActive: true,
                isEmailVerified: true,
            },
        });
    }
    return mechanic;
}
async function seedMechanicProducts() {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('MongoDB Connected');
        const mechanic = await ensureMechanicAccount();
        console.log(`Using mechanic account: ${MECHANIC_EMAIL}`);
        let createdCount = 0;
        let updatedCount = 0;
        for (const product of SAMPLE_PRODUCTS) {
            const existing = await Product_1.default.findOne({ seller: mechanic._id, sku: product.sku });
            if (existing) {
                existing.name = product.name;
                existing.description = product.description;
                existing.category = product.category;
                existing.brand = product.brand;
                existing.price = product.price;
                existing.originalPrice = product.originalPrice;
                existing.stock = product.stock;
                existing.images = product.images;
                existing.status = 'active';
                existing.type = 'product';
                await existing.save();
                updatedCount += 1;
            }
            else {
                await Product_1.default.create({
                    seller: mechanic._id,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    brand: product.brand,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    stock: product.stock,
                    images: product.images,
                    sku: product.sku,
                    status: 'active',
                    type: 'product',
                });
                createdCount += 1;
            }
        }
        console.log(`Created: ${createdCount}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Total sample products processed: ${SAMPLE_PRODUCTS.length}`);
        console.log('\nCredentials:');
        console.log(`${MECHANIC_EMAIL} / ${MECHANIC_PASSWORD}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding mechanic products:', error);
        process.exit(1);
    }
}
seedMechanicProducts();
