const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User').default;
const Product = require('../src/models/Product').default;
const Service = require('../src/models/Service').default;
const config = require('../src/config').default;

dotenv.config();

const sampleProducts = [
  { name: 'Premium Brake Pads', category: 'Suspension & Brakes', brand: 'Yamaha', price: 3500, stock: 20 },
  { name: 'Sport Engine Oil 10W40', category: 'Engine Parts', brand: 'Motul', price: 4200, stock: 50 },
  { name: 'LED Headlight Bulb', category: 'Lighting & Signals', brand: 'Honda', price: 1500, stock: 35 },
  { name: 'Rear Shock Absorber', category: 'Suspension & Brakes', brand: 'Suzuki', price: 8900, stock: 15 },
  { name: 'Performance Air Filter', category: 'Engine Parts', brand: 'K&N', price: 2800, stock: 25 },
];

const sampleServices = [
  { name: 'Full Engine Tune-up', category: 'Engine Care', duration: '2h', price: 5000 },
  { name: 'Brake Pad Replacement', category: 'Braking System', duration: '45m', price: 1500 },
  { name: 'Oil and Filter Change', category: 'Periodic Maintenance', duration: '30m', price: 1000 },
  { name: 'Electrical Diagnostics', category: 'Electrical', duration: '1h', price: 2500 },
  { name: 'Chain Adjustment & Lube', category: 'Drivetrain', duration: '20m', price: 800 },
];

const run = async () => {
    try {
        await mongoose.connect(config.mongoURI);
        console.log('Connected to MongoDB');

        const sellerEmails = ['seller1@samplemail.com', 'seller2@samplemail.com'];
        const mechanicEmails = ['mechanic1@samplemail.com', 'mechanic2@samplemail.com'];

        // Add 5 products for sellers
        for (const email of sellerEmails) {
            const user = await User.findOne({ email });
            if (user) {
                for (let i = 0; i < 5; i++) {
                    const prod = sampleProducts[i];
                    await Product.create({
                        seller: user._id,
                        name: `${prod.name} (Seller)`,
                        description: `High quality ${prod.name}`,
                        category: prod.category,
                        brand: prod.brand,
                        price: prod.price,
                        originalPrice: prod.price + 500,
                        stock: prod.stock,
                        images: ['https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg'],
                        status: 'active',
                        productStatus: 'ENABLED',
                        sku: `SEL-${user._id.toString().slice(-4)}-${i}-${Date.now()}`,
                        type: 'product',
                    });
                }
                console.log(`Added 5 products for ${email}`);
            } else {
                console.log(`User not found: ${email}`);
            }
        }

        // Add 5 products and 5 services for mechanics
        for (const email of mechanicEmails) {
            const user = await User.findOne({ email });
            if (user) {
                for (let i = 0; i < 5; i++) {
                    const prod = sampleProducts[i];
                    await Product.create({
                        seller: user._id,
                        name: `${prod.name} (Mechanic)`,
                        description: `High quality ${prod.name}`,
                        category: prod.category,
                        brand: prod.brand,
                        price: prod.price,
                        originalPrice: prod.price + 500,
                        stock: prod.stock,
                        images: ['https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg'],
                        status: 'active',
                        productStatus: 'ENABLED',
                        sku: `MEC-${user._id.toString().slice(-4)}-${i}-${Date.now()}`,
                        type: 'product',
                    });
                    
                    const srv = sampleServices[i];
                    await Service.create({
                        mechanic: user._id,
                        name: `${srv.name}`,
                        description: `Professional ${srv.name}`,
                        category: srv.category,
                        duration: srv.duration,
                        price: srv.price,
                        originalPrice: srv.price + 500,
                        active: true,
                        productStatus: 'ENABLED',
                        images: ['https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg'],
                    });
                }
                console.log(`Added 5 products and 5 services for ${email}`);
            } else {
                console.log(`User not found: ${email}`);
            }
        }

        console.log('Done');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
run();
