"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../src/models/User"));
const Service_1 = __importDefault(require("../src/models/Service"));
const config_1 = __importDefault(require("../src/config"));
dotenv_1.default.config();
const MECHANICS = [
    {
        firstName: 'P. Saravanappiriyan',
        lastName: 'Thiruchelvam',
        email: 'psaravanappiriyan@gmail.com',
        phone: '+94 76 398 1174',
        specialization: 'Engine Overhaul & Performance Tuning',
        experienceYears: 11,
        workshopName: 'Saravan Moto Works',
        workshopLocation: 'Kopay, Jaffna',
    },
    {
        firstName: 'Nanthujan',
        lastName: 'Sivapalan',
        email: 'nanthujan0@gmail.com',
        phone: '+94 77 912 3488',
        specialization: 'Electrical, Sensors & Diagnostics',
        experienceYears: 9,
        workshopName: 'Nanthu Bike Diagnostics',
        workshopLocation: 'Stanley Road, Jaffna',
    },
];
const SERVICE_LIBRARY = [
    {
        name: 'Full Service - 150cc to 250cc',
        category: 'Periodic Maintenance',
        duration: '2h 30m',
        basePrice: 8500,
        description: 'Comprehensive periodic service inspired by common OEM maintenance checklists: oil change, filter check, chain clean/lube, and fastener inspection.',
    },
    {
        name: 'Engine Oil + Oil Filter Replacement',
        category: 'Engine Care',
        duration: '45m',
        basePrice: 3500,
        description: 'Oil and filter replacement using viscosity grades recommended in mainstream motorcycle owner manuals for tropical riding conditions.',
    },
    {
        name: 'Chain & Sprocket Kit Installation',
        category: 'Drivetrain',
        duration: '1h 20m',
        basePrice: 5200,
        description: 'Front/rear sprocket and chain replacement with chain slack adjustment based on manufacturer range specs published for commuter and sport bikes.',
    },
    {
        name: 'Brake Pad + Brake Fluid Service',
        category: 'Braking System',
        duration: '1h 10m',
        basePrice: 4800,
        description: 'Disc pad replacement and DOT4 fluid bleed inspired by standard workshop procedures used by top international service centers.',
    },
    {
        name: 'EFI/ECU Scan and Fault Diagnosis',
        category: 'Diagnostics',
        duration: '1h',
        basePrice: 4200,
        description: 'Scan tool-based diagnosis for sensor and actuator faults, with recommendations based on publicly documented OBD troubleshooting practices.',
    },
    {
        name: 'Battery, Charging & Starter Test',
        category: 'Electrical',
        duration: '40m',
        basePrice: 2800,
        description: 'Charging-system and starter current checks using benchmark test flows found in international motorcycle electrical service guides.',
    },
    {
        name: 'Front Fork Seal and Oil Service',
        category: 'Suspension',
        duration: '2h',
        basePrice: 7200,
        description: 'Fork disassembly, seal replacement, and oil refill with setup guidance aligned with widely used rider and suspension setup references.',
    },
    {
        name: 'Pre-Trip Safety Inspection',
        category: 'Inspection',
        duration: '35m',
        basePrice: 1800,
        description: 'Quick touring safety check covering tires, brakes, lights, chain, and coolant inspired by global rider association pre-ride checklists.',
    },
];
const IMAGE_URLS = [
    'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1119796/pexels-photo-1119796.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/995301/pexels-photo-995301.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1309772/pexels-photo-1309772.jpeg?auto=compress&cs=tinysrgb&w=1200',
];
const PRODUCT_LIBRARY = [
    {
        name: 'NGK Iridium Spark Plug Set',
        category: 'Electrical',
        brand: 'NGK',
        basePrice: 3200,
        stock: 24,
        description: 'Long-life iridium plug set used in popular commuter and sport motorcycles for reliable ignition performance.',
    },
    {
        name: 'DID Chain and Sprocket Kit',
        category: 'Transmission',
        brand: 'DID',
        basePrice: 9800,
        stock: 12,
        description: 'Heavy-duty chain/sprocket combo selected from high-demand kits sold by online moto parts stores.',
    },
    {
        name: 'EBC Front Brake Pad Pair',
        category: 'Brakes',
        brand: 'EBC',
        basePrice: 4500,
        stock: 18,
        description: 'Sintered brake pads designed for better bite and heat resistance on city and highway rides.',
    },
    {
        name: 'Motul 7100 10W40 Engine Oil 1L',
        category: 'Engine Parts',
        brand: 'Motul',
        basePrice: 4200,
        stock: 30,
        description: 'Fully synthetic motorcycle engine oil preferred by many workshops for smooth shifting and hot-weather protection.',
    },
    {
        name: 'Yuasa 12V Maintenance-Free Battery',
        category: 'Electrical',
        brand: 'Yuasa',
        basePrice: 11500,
        stock: 10,
        description: 'Sealed battery model compatible with several 150cc-250cc bikes, known for dependable cold starts.',
    },
];
const ensureMechanic = async (mechanicData) => {
    let mechanic = await User_1.default.findOne({ email: mechanicData.email, role: 'mechanic' }).select('+password');
    if (!mechanic) {
        mechanic = await User_1.default.create({
            ...mechanicData,
            role: 'mechanic',
            password: 'mechanic123',
            isEmailVerified: true,
            isActive: true,
            approvalStatus: 'approved',
            approvedAt: new Date(),
        });
    }
    mechanic.firstName = mechanicData.firstName;
    mechanic.lastName = mechanicData.lastName;
    mechanic.phone = mechanicData.phone;
    mechanic.specialization = mechanicData.specialization;
    mechanic.experienceYears = mechanicData.experienceYears;
    mechanic.workshopName = mechanicData.workshopName;
    mechanic.workshopLocation = mechanicData.workshopLocation;
    mechanic.isActive = true;
    mechanic.isEmailVerified = true;
    mechanic.approvalStatus = 'approved';
    mechanic.approvedAt = new Date();
    mechanic.password = 'mechanic123';
    await mechanic.save();
    const fresh = await User_1.default.findById(mechanic._id);
    if (!fresh) {
        throw new Error(`Failed to load mechanic account: ${mechanicData.email}`);
    }
    return fresh;
};
const buildServicesForMechanic = (mechanic, indexOffset) => {
    return SERVICE_LIBRARY.map((template, idx) => {
        const dynamicPrice = template.basePrice + ((idx + indexOffset) % 3) * 300;
        return {
            mechanic: mechanic._id,
            name: template.name,
            description: `${template.description} Available at ${mechanic.workshopName || 'our workshop'}.`,
            category: template.category,
            duration: template.duration,
            price: dynamicPrice,
            active: true,
        };
    });
};
const buildProductsForMechanic = (mechanic, indexOffset) => {
    return PRODUCT_LIBRARY.map((template, idx) => {
        const price = template.basePrice + ((indexOffset + idx) % 3) * 250;
        const imageOne = IMAGE_URLS[(idx + indexOffset) % IMAGE_URLS.length];
        const imageTwo = IMAGE_URLS[(idx + indexOffset + 2) % IMAGE_URLS.length];
        const sku = `MECH-${String(indexOffset + 1).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`;
        return {
            seller: mechanic._id,
            name: template.name,
            description: `${template.description} Supplied by ${mechanic.workshopName || 'workshop stock'}.`,
            category: template.category,
            brand: template.brand,
            price,
            originalPrice: price + 600,
            stock: template.stock,
            images: [imageOne, imageTwo],
            sku,
            status: 'active',
            type: 'product',
            views: 0,
            sales: 0,
        };
    });
};
const seedServices = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongoURI);
        console.log('✓ MongoDB Connected\n');
        // Get all approved mechanics
        const mechanics = await User_1.default.find({ role: 'mechanic', approvalStatus: 'approved' });
        console.log(`🔧 Found ${mechanics.length} mechanics\n`);
        let totalServicesCreated = 0;
        for (let mechanicIdx = 0; mechanicIdx < mechanics.length; mechanicIdx++) {
            const mechanic = mechanics[mechanicIdx];
            console.log(`\n🔧 Adding services for: ${mechanic.workshopName || `Mechanic ${mechanicIdx + 1}`}`);
            console.log(`   Email: ${mechanic.email}`);
            console.log('─────────────────────────────────────────────────────');
            let mechanicServiceCount = 0;
            // Add 10 services for each mechanic
            const realServices = [
                {
                    name: 'Full Service - 150cc to 250cc',
                    category: 'Periodic Maintenance',
                    duration: '2h 30m',
                    price: 8500,
                    originalPrice: 10500,
                    description: 'Comprehensive periodic service: oil change, filter check, chain clean/lube, fastener inspection, and brake fluid check.'
                },
                {
                    name: 'Engine Oil & Oil Filter Replacement',
                    category: 'Engine Care',
                    duration: '45m',
                    price: 3500,
                    originalPrice: 4200,
                    description: 'Premium oil and filter replacement with oil level and engine condition check.'
                },
                {
                    name: 'Chain & Sprocket Kit Installation',
                    category: 'Drivetrain',
                    duration: '1h 20m',
                    price: 5200,
                    originalPrice: 6500,
                    description: 'Complete chain and sprocket replacement with proper tension adjustment.'
                },
                {
                    name: 'Brake Pad + Brake Fluid Service',
                    category: 'Braking System',
                    duration: '1h 10m',
                    price: 4800,
                    originalPrice: 6000,
                    description: 'Disc pad replacement with DOT4 fluid bleed and brake system inspection.'
                },
                {
                    name: 'EFI/ECU Scan & Diagnostics',
                    category: 'Diagnostics',
                    duration: '1h',
                    price: 4200,
                    originalPrice: 5200,
                    description: 'Complete engine diagnostics with OBD scanner to identify and fix fault codes.'
                },
                {
                    name: 'Battery & Charging System Test',
                    category: 'Electrical',
                    duration: '40m',
                    price: 2800,
                    originalPrice: 3500,
                    description: 'Battery voltage, alternator output, and charging system health check.'
                },
                {
                    name: 'Front Fork Seal & Oil Service',
                    category: 'Suspension',
                    duration: '2h',
                    price: 7200,
                    originalPrice: 9000,
                    description: 'Fork disassembly, seal replacement, and fork oil refill with compression check.'
                },
                {
                    name: 'Pre-Trip Safety Inspection',
                    category: 'Inspection',
                    duration: '35m',
                    price: 1800,
                    originalPrice: 2200,
                    description: 'Quick safety check: tires, brakes, lights, chain, coolant, and fluid levels.'
                },
                {
                    name: 'Wheel Alignment & Balancing',
                    category: 'Wheels & Tires',
                    duration: '1h 30m',
                    price: 5500,
                    originalPrice: 7000,
                    description: 'Wheel balancing and alignment for smooth ride and extended tire life.'
                },
                {
                    name: 'Air Filter & Cabin Filter Replacement',
                    category: 'Engine Care',
                    duration: '25m',
                    price: 2200,
                    originalPrice: 2800,
                    description: 'Engine air filter and cabin filter replacement with engine intake inspection.'
                }
            ];
            for (let serviceIdx = 0; serviceIdx < realServices.length; serviceIdx++) {
                const serviceTemplate = realServices[serviceIdx];
                const serviceData = {
                    mechanic: mechanic._id,
                    name: `${serviceTemplate.name} - ${mechanic.workshopName}`,
                    description: `${serviceTemplate.description} Available at ${mechanic.workshopName || 'our workshop'} with experienced technician.`,
                    category: serviceTemplate.category,
                    duration: serviceTemplate.duration,
                    price: serviceTemplate.price,
                    originalPrice: serviceTemplate.originalPrice,
                    active: true,
                    productStatus: 'ENABLED',
                    images: [IMAGE_URLS[serviceIdx % IMAGE_URLS.length]]
                };
                const existing = await Service_1.default.findOne({
                    mechanic: mechanic._id,
                    name: serviceData.name
                });
                if (!existing) {
                    await Service_1.default.create(serviceData);
                    mechanicServiceCount++;
                    totalServicesCreated++;
                }
            }
            console.log(`  ✓ Added ${mechanicServiceCount} services`);
        }
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                    SERVICES SEEDED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`✓ Total services created: ${totalServicesCreated}`);
        console.log(`  • Mechanics: ${mechanics.length}`);
        console.log(`  • Services per mechanic: 10`);
        console.log(`  • Total: ${mechanics.length * 10}\n`);
        console.log('📊 SERVICE CATEGORIES:');
        const categories = new Set();
        SERVICE_LIBRARY.forEach(s => categories.add(s.category));
        Array.from(categories).forEach((cat, idx) => {
            console.log(`  ${idx + 1}. ${cat}`);
        });
        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('✅ Services Features:');
        console.log('  • Real motorcycle service types');
        console.log('  • Realistic service durations');
        console.log('  • Sri Lankan Rupee (LKR) pricing');
        console.log('  • Original prices for discount calculation');
        console.log('  • Service images from Pexels');
        console.log('  • Detailed service descriptions');
        console.log('  • ENABLED status\n');
        console.log('💡 Next: Update image URLs to Cloudinary if needed.\n');
        await mongoose_1.default.disconnect();
        console.log('Done.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding services:', error);
        process.exit(1);
    }
};
seedServices();
seedServices();
