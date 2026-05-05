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
// Realistic motorcycle parts data for Sri Lanka market (Prices in LKR)
const partsDatabase = {
    'Engine Parts': {
        brands: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki'],
        products: [
            { name: 'Oil Filter', price: 1200, originalPrice: 1500, stock: 50 },
            { name: 'Air Filter', price: 1800, originalPrice: 2200, stock: 45 },
            { name: 'Spark Plug (Set of 4)', price: 2400, originalPrice: 3000, stock: 40 },
            { name: 'Engine Gasket Set', price: 3500, originalPrice: 4500, stock: 25 },
            { name: 'Piston Ring Set', price: 5800, originalPrice: 7200, stock: 20 }
        ]
    },
    'Suspension & Brakes': {
        brands: ['Yamaha', 'Suzuki', 'BMW', 'KTM'],
        products: [
            { name: 'Front Brake Pads', price: 3200, originalPrice: 4000, stock: 60 },
            { name: 'Rear Brake Pads', price: 2800, originalPrice: 3500, stock: 55 },
            { name: 'Brake Disc (Front)', price: 4500, originalPrice: 5500, stock: 35 },
            { name: 'Shock Absorber (Rear)', price: 8900, originalPrice: 11000, stock: 18 },
            { name: 'Spring Kit', price: 6200, originalPrice: 7800, stock: 22 }
        ]
    },
    'Transmission & Clutch': {
        brands: ['Honda', 'Kawasaki', 'Royal Enfield', 'Bajaj'],
        products: [
            { name: 'Clutch Cable', price: 1600, originalPrice: 2000, stock: 48 },
            { name: 'Clutch Plates Set', price: 4200, originalPrice: 5200, stock: 28 },
            { name: 'Gear Oil 10W40 (1L)', price: 1400, originalPrice: 1700, stock: 65 },
            { name: 'Chain Sprocket Set', price: 8500, originalPrice: 10500, stock: 15 },
            { name: 'Drive Chain', price: 6800, originalPrice: 8400, stock: 20 }
        ]
    },
    'Tires & Wheels': {
        brands: ['Michelin', 'Bridgestone', 'Dunlop', 'MRF'],
        products: [
            { name: 'Front Tire (130/80-17)', price: 8500, originalPrice: 10500, stock: 12 },
            { name: 'Rear Tire (160/60-17)', price: 9200, originalPrice: 11500, stock: 10 },
            { name: 'Wheel Rim (Front)', price: 5600, originalPrice: 7000, stock: 8 },
            { name: 'Wheel Rim (Rear)', price: 6200, originalPrice: 7800, stock: 8 },
            { name: 'Tube Repair Kit', price: 450, originalPrice: 600, stock: 100 }
        ]
    },
    'Electrical & Electronics': {
        brands: ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki'],
        products: [
            { name: 'Battery 12V 7Ah', price: 4800, originalPrice: 6000, stock: 30 },
            { name: 'Alternator/Generator', price: 12500, originalPrice: 15500, stock: 10 },
            { name: 'Starter Motor', price: 8200, originalPrice: 10200, stock: 12 },
            { name: 'Voltage Regulator', price: 2200, originalPrice: 2800, stock: 40 },
            { name: 'LED Bulb Set', price: 1200, originalPrice: 1500, stock: 55 }
        ]
    },
    'Lighting & Signals': {
        brands: ['Yamaha', 'Honda', 'KTM', 'Royal Enfield'],
        products: [
            { name: 'Headlight Assembly', price: 5400, originalPrice: 6800, stock: 22 },
            { name: 'Taillight Module', price: 3200, originalPrice: 4000, stock: 28 },
            { name: 'Turn Signal Set', price: 2600, originalPrice: 3200, stock: 38 },
            { name: 'Speedometer Instrument', price: 4200, originalPrice: 5200, stock: 15 },
            { name: 'Headlight Bulb (H4)', price: 850, originalPrice: 1050, stock: 70 }
        ]
    },
    'Air & Fuel Systems': {
        brands: ['Suzuki', 'Kawasaki', 'Bajaj', 'TVS'],
        products: [
            { name: 'Fuel Filter', price: 980, originalPrice: 1200, stock: 48 },
            { name: 'Air Filter Box', price: 2800, originalPrice: 3500, stock: 20 },
            { name: 'Carburetor Assembly', price: 6500, originalPrice: 8000, stock: 12 },
            { name: 'Fuel Pump', price: 8800, originalPrice: 11000, stock: 10 },
            { name: 'Air Intake Manifold', price: 3600, originalPrice: 4500, stock: 18 }
        ]
    },
    'Cooling Systems': {
        brands: ['Honda', 'Yamaha', 'BMW', 'KTM'],
        products: [
            { name: 'Radiator Fan', price: 4200, originalPrice: 5200, stock: 16 },
            { name: 'Thermostat', price: 1800, originalPrice: 2200, stock: 35 },
            { name: 'Coolant 1L', price: 1200, originalPrice: 1500, stock: 50 },
            { name: 'Water Pump', price: 6800, originalPrice: 8400, stock: 12 },
            { name: 'Radiator Hose Set', price: 2400, originalPrice: 3000, stock: 28 }
        ]
    },
    'Body & Accessories': {
        brands: ['Honda', 'Yamaha', 'Suzuki', 'Royal Enfield'],
        products: [
            { name: 'Side Mirror Pair', price: 2200, originalPrice: 2800, stock: 32 },
            { name: 'Seat Cover', price: 1800, originalPrice: 2200, stock: 40 },
            { name: 'Foot Pegs Pair', price: 1400, originalPrice: 1800, stock: 45 },
            { name: 'Handlebar Grip Set', price: 1100, originalPrice: 1400, stock: 50 },
            { name: 'Chain Guard', price: 2000, originalPrice: 2500, stock: 25 }
        ]
    },
    'Exhaust Systems': {
        brands: ['Kawasaki', 'BMW', 'KTM', 'Harley-Davidson'],
        products: [
            { name: 'Exhaust Silencer', price: 9500, originalPrice: 12000, stock: 10 },
            { name: 'Muffler Pipe', price: 5200, originalPrice: 6500, stock: 14 },
            { name: 'Exhaust Gasket', price: 680, originalPrice: 850, stock: 60 },
            { name: 'Heat Shield', price: 2800, originalPrice: 3500, stock: 22 },
            { name: 'Catalytic Converter', price: 18000, originalPrice: 22500, stock: 6 }
        ]
    }
};
// Category-specific motorcycle part images from Pexels
const CATEGORY_IMAGE_URLS = {
    'Engine Parts': [
        'https://images.pexels.com/photos/30304159/pexels-photo-30304159.jpeg?cs=srgb&dl=pexels-roktim619-30304159.jpg&fm=jpg',
        'https://images.pexels.com/photos/30866489/pexels-photo-30866489.jpeg?cs=srgb&dl=pexels-jannisr-30866489.jpg&fm=jpg',
        'https://images.pexels.com/photos/5111324/pexels-photo-5111324.jpeg?cs=srgb&dl=pexels-magda-ehlers-pexels-5111324.jpg&fm=jpg',
        'https://images.pexels.com/photos/19473077/pexels-photo-19473077.jpeg?cs=srgb&dl=pexels-landsmann-803094805-19473077.jpg&fm=jpg',
        'https://images.pexels.com/photos/29222062/pexels-photo-29222062.jpeg?cs=srgb&dl=pexels-eduard-kalesnik-2057421638-29222062.jpg&fm=jpg',
    ],
    'Suspension & Brakes': [
        'https://images.pexels.com/photos/1683406/pexels-photo-1683406.jpeg?cs=srgb&dl=pexels-lilartsy-1683406.jpg&fm=jpg',
        'https://images.pexels.com/photos/17900715/pexels-photo-17900715.jpeg?cs=srgb&dl=pexels-entero-17900715.jpg&fm=jpg',
        'https://images.pexels.com/photos/9607353/pexels-photo-9607353.jpeg?cs=srgb&dl=pexels-anastasia-shuraeva-9607353.jpg&fm=jpg',
        'https://images.pexels.com/photos/5184998/pexels-photo-5184998.jpeg?cs=srgb&dl=pexels-cottonbro-5184998.jpg&fm=jpg',
        'https://images.pexels.com/photos/29279937/pexels-photo-29279937.jpeg?cs=srgb&dl=pexels-vahapdmr-29279937.jpg&fm=jpg',
    ],
    'Transmission & Clutch': [
        'https://images.pexels.com/photos/34240236/pexels-photo-34240236.jpeg?cs=srgb&dl=pexels-photogramary-2154599354-34240236.jpg&fm=jpg',
        'https://images.pexels.com/photos/9607395/pexels-photo-9607395.jpeg?cs=srgb&dl=pexels-anastasia-shuraeva-9607395.jpg&fm=jpg',
        'https://images.pexels.com/photos/5111315/pexels-photo-5111315.jpeg?cs=srgb&dl=pexels-magda-ehlers-pexels-5111315.jpg&fm=jpg',
        'https://images.pexels.com/photos/18074949/pexels-photo-18074949.jpeg?cs=srgb&dl=pexels-michelle-toma-493475475-18074949.jpg&fm=jpg',
        'https://images.pexels.com/photos/37131862/pexels-photo-37131862.jpeg?cs=srgb&dl=pexels-ayoub-benamor-2160847105-37131862.jpg&fm=jpg',
    ],
    'Tires & Wheels': [
        'https://images.pexels.com/photos/97049/pexels-photo-97049.jpeg?cs=srgb&dl=pexels-markusspiske-97049.jpg&fm=jpg',
        'https://images.pexels.com/photos/9305129/pexels-photo-9305129.jpeg?cs=srgb&dl=pexels-stephentcandrews-9305129.jpg&fm=jpg',
        'https://images.pexels.com/photos/36813241/pexels-photo-36813241.jpeg?cs=srgb&dl=pexels-nandish-kumar-1238677-36813241.jpg&fm=jpg',
        'https://images.pexels.com/photos/16439608/pexels-photo-16439608.jpeg?cs=srgb&dl=pexels-ardit-mbrati-216809103-16439608.jpg&fm=jpg',
        'https://images.pexels.com/photos/29740729/pexels-photo-29740729.jpeg?cs=srgb&dl=pexels-harveyvillarino-29740729.jpg&fm=jpg',
    ],
    'Electrical & Electronics': [
        'https://images.pexels.com/photos/37177070/pexels-photo-37177070.jpeg?cs=srgb&dl=pexels-ayyeee-ayyeee-434363205-37177070.jpg&fm=jpg',
        'https://images.pexels.com/photos/115145/pexels-photo-115145.jpeg?cs=srgb&dl=pexels-revac-film-s-photography-10400-115145.jpg&fm=jpg',
        'https://images.pexels.com/photos/11211294/pexels-photo-11211294.jpeg?cs=srgb&dl=pexels-photobombcars-11211294.jpg&fm=jpg',
        'https://images.pexels.com/photos/16129881/pexels-photo-16129881.jpeg?cs=srgb&dl=pexels-louitina-palaiologou-37403807-16129881.jpg&fm=jpg',
        'https://images.pexels.com/photos/35393849/pexels-photo-35393849.jpeg?cs=srgb&dl=pexels-cottonbro-35393849.jpg&fm=jpg',
    ],
    'Lighting & Signals': [
        'https://images.pexels.com/photos/17883731/pexels-photo-17883731.png?cs=srgb&dl=pexels-otaviiow-17883731.jpg&fm=jpg',
        'https://images.pexels.com/photos/20008574/pexels-photo-20008574.jpeg?cs=srgb&dl=pexels-noren-dl-927912486-20008574.jpg&fm=jpg',
        'https://images.pexels.com/photos/13023887/pexels-photo-13023887.jpeg?cs=srgb&dl=pexels-image-hunter-281453274-13023887.jpg&fm=jpg',
        'https://images.pexels.com/photos/13377440/pexels-photo-13377440.jpeg?cs=srgb&dl=pexels-kassiamelox-13377440.jpg&fm=jpg',
        'https://images.pexels.com/photos/2607073/pexels-photo-2607073.jpeg?cs=srgb&dl=pexels-jamphotography-2607073.jpg&fm=jpg',
    ],
    'Air & Fuel Systems': [
        'https://images.pexels.com/photos/19898110/pexels-photo-19898110.jpeg?cs=srgb&dl=pexels-donald-nicholson-108390307-19898110.jpg&fm=jpg',
        'https://images.pexels.com/photos/11074558/pexels-photo-11074558.jpeg?cs=srgb&dl=pexels-benjamin-walsham-159059246-11074558.jpg&fm=jpg',
        'https://images.pexels.com/photos/31292504/pexels-photo-31292504.jpeg?cs=srgb&dl=pexels-nguy-n-ti-n-th-nh-2150376175-31292504.jpg&fm=jpg',
        'https://images.pexels.com/photos/16033294/pexels-photo-16033294.jpeg?cs=srgb&dl=pexels-entero-16033294.jpg&fm=jpg',
        'https://images.pexels.com/photos/26655306/pexels-photo-26655306.jpeg?cs=srgb&dl=pexels-couleur-26655306.jpg&fm=jpg',
    ],
    'Cooling Systems': [
        'https://images.pexels.com/photos/9562264/pexels-photo-9562264.jpeg?cs=srgb&dl=pexels-harveyvillarino-9562264.jpg&fm=jpg',
        'https://images.pexels.com/photos/4577456/pexels-photo-4577456.jpeg?cs=srgb&dl=pexels-rachel-claire-4577456.jpg&fm=jpg',
        'https://images.pexels.com/photos/11890957/pexels-photo-11890957.jpeg?cs=srgb&dl=pexels-mickhaupt-11890957.jpg&fm=jpg',
        'https://images.pexels.com/photos/9607050/pexels-photo-9607050.jpeg?cs=srgb&dl=pexels-anastasia-shuraeva-9607050.jpg&fm=jpg',
        'https://images.pexels.com/photos/17780143/pexels-photo-17780143.jpeg?cs=srgb&dl=pexels-yakup-polat-420882786-17780143.jpg&fm=jpg',
    ],
    'Body & Accessories': [
        'https://images.pexels.com/photos/28051514/pexels-photo-28051514.jpeg?cs=srgb&dl=pexels-pratik-brahmbhatt-1479980869-28051514.jpg&fm=jpg',
        'https://images.pexels.com/photos/31847540/pexels-photo-31847540.jpeg?cs=srgb&dl=pexels-spolyakov-31847540.jpg&fm=jpg',
        'https://images.pexels.com/photos/33582592/pexels-photo-33582592.jpeg?cs=srgb&dl=pexels-johanna-2151290000-33582592.jpg&fm=jpg',
        'https://images.pexels.com/photos/29740637/pexels-photo-29740637.jpeg?cs=srgb&dl=pexels-harveyvillarino-29740637.jpg&fm=jpg',
        'https://images.pexels.com/photos/33469801/pexels-photo-33469801.jpeg?cs=srgb&dl=pexels-ene-marius-241207761-33469801.jpg&fm=jpg',
    ],
    'Exhaust Systems': [
        'https://images.pexels.com/photos/36885382/pexels-photo-36885382.jpeg?cs=srgb&dl=pexels-baran-karakelle-2160650505-36885382.jpg&fm=jpg',
        'https://images.pexels.com/photos/16033295/pexels-photo-16033295.jpeg?cs=srgb&dl=pexels-entero-16033295.jpg&fm=jpg',
        'https://images.pexels.com/photos/14600354/pexels-photo-14600354.jpeg?cs=srgb&dl=pexels-ahrphotography-14600354.jpg&fm=jpg',
        'https://images.pexels.com/photos/33474404/pexels-photo-33474404.jpeg?cs=srgb&dl=pexels-shndgd-33474404.jpg&fm=jpg',
        'https://images.pexels.com/photos/35141603/pexels-photo-35141603.jpeg?cs=srgb&dl=pexels-gladin-joseph-2087591411-35141603.jpg&fm=jpg',
    ],
};
const getCategoryImage = (category, sellerIndex, productIndex) => {
    const images = CATEGORY_IMAGE_URLS[category] ?? [];
    if (images.length === 0) {
        return 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1200';
    }
    return images[(sellerIndex + productIndex) % images.length];
};
const OTHER_SELLERS = [
    {
        firstName: 'Nimal',
        lastName: 'Silva',
        email: 'seller2@gmail.com',
        phone: '+94 71 234 5678',
        shopName: 'Silva Motors & Parts',
        shopDescription: 'Genuine and aftermarket motorcycle parts for daily riders and enthusiasts.',
        shopLocation: '12/B, Kandy Road, Peradeniya',
    },
    {
        firstName: 'Chathura',
        lastName: 'Mendis',
        email: 'seller3@gmail.com',
        phone: '+94 77 201 9044',
        shopName: 'MotoHub Colombo',
        shopDescription: 'Urban store focused on premium bike accessories and performance upgrades.',
        shopLocation: 'Union Place, Colombo 02',
    },
    {
        firstName: 'Asanka',
        lastName: 'Jayasuriya',
        email: 'seller4@gmail.com',
        phone: '+94 76 558 1190',
        shopName: 'Southern Riders Supply',
        shopDescription: 'Trusted spare parts partner for riders in Southern province.',
        shopLocation: 'Matara Road, Galle',
    },
    {
        firstName: 'Rashmi',
        lastName: 'Ekanayake',
        email: 'seller5@gmail.com',
        phone: '+94 70 991 6234',
        shopName: 'Hill Country Bike Store',
        shopDescription: 'Complete range of quality parts for mountain and city bikes.',
        shopLocation: 'Peradeniya Road, Kandy',
    },
    {
        firstName: 'Tharindu',
        lastName: 'Fernando',
        email: 'seller6@gmail.com',
        phone: '+94 75 333 8181',
        shopName: 'SpeedLine Moto Traders',
        shopDescription: 'Focused on fast-moving inventory, protective gear, and racing components.',
        shopLocation: 'Negombo Road, Ja-Ela',
    },
];
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
const seedProducts = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        // Get all approved sellers
        const sellers = await User_1.default.find({ role: 'seller', approvalStatus: 'approved' });
        console.log(`📦 Found ${sellers.length} sellers\n`);
        let totalProductsCreated = 0;
        const categories = Object.keys(partsDatabase);
        for (let sellerIdx = 0; sellerIdx < sellers.length; sellerIdx++) {
            const seller = sellers[sellerIdx];
            console.log(`\n📦 Adding products for: ${seller.shopName || `Seller ${sellerIdx + 1}`}`);
            console.log(`   Email: ${seller.email}`);
            console.log('─────────────────────────────────────────────────────');
            let sellerProductCount = 0;
            // Each seller gets 20 products across different categories
            for (let prodIdx = 0; prodIdx < 20; prodIdx++) {
                const categoryIndex = prodIdx % categories.length;
                const category = categories[categoryIndex];
                const categoryData = partsDatabase[category];
                const productIndex = Math.floor(prodIdx / categories.length);
                const product = categoryData.products[productIndex % categoryData.products.length];
                const brand = categoryData.brands[sellerIdx % categoryData.brands.length];
                const productData = {
                    seller: seller._id,
                    name: `${product.name} - ${brand}`,
                    description: `High quality ${product.name.toLowerCase()} for ${brand} motorcycles. Genuine parts, tested for durability and performance. Fast delivery available.`,
                    category,
                    brand,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    stock: Math.max(5, product.stock - randomInt(0, 30)),
                    images: [getCategoryImage(category, sellerIdx, productIndex)],
                    status: 'active',
                    productStatus: 'ENABLED',
                    sku: `${seller._id.toString().slice(-6)}-${String(prodIdx + 1).padStart(3, '0')}`,
                    type: 'product',
                    views: randomInt(5, 150),
                    sales: randomInt(0, 30),
                    embedding: []
                };
                const existing = await Product_1.default.findOne({
                    seller: seller._id,
                    sku: productData.sku
                });
                if (!existing) {
                    await Product_1.default.create(productData);
                    sellerProductCount++;
                    totalProductsCreated++;
                }
            }
            console.log(`  ✓ Added ${sellerProductCount} products`);
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                    PRODUCTS SEEDED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Total products created: ${totalProductsCreated}`);
        console.log(`  • Sellers: ${sellers.length}`);
        console.log(`  • Products per seller: 20`);
        console.log(`  • Total: ${sellers.length * 20}\n`);
        console.log('📊 PRODUCT CATEGORIES:');
        categories.forEach((cat, idx) => {
            console.log(`  ${idx + 1}. ${cat}`);
        });
        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('✅ Products Features:');
        console.log('  • Real motorcycle brands (Honda, Yamaha, Suzuki, etc.)');
        console.log('  • Real parts categories and names');
        console.log('  • Sri Lankan Rupee (LKR) pricing');
        console.log('  • Realistic stock levels');
        console.log('  • Real motorcycle images (Pexels)');
        console.log('  • Original prices for discount calculation');
        console.log('  • SKU codes for each product');
        console.log('  • Active and ENABLED status\n');
        console.log('💡 Next: Images are from Pexels. To use Cloudinary images, update URLs.\n');
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding products:', error);
        process.exit(1);
    }
};
seedProducts();
