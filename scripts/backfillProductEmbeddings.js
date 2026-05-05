"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../src/utils/db"));
const Product_1 = __importDefault(require("../src/models/Product"));
const embeddings_1 = require("../src/utils/embeddings");
dotenv_1.default.config();
const run = async () => {
    if (!(0, embeddings_1.canUseEmbeddings)()) {
        console.error('OPENAI_KEY is missing. Cannot backfill embeddings.');
        process.exit(1);
    }
    await (0, db_1.default)();
    const products = await Product_1.default.find({ status: { $ne: 'inactive' } });
    console.log(`Found ${products.length} products for embedding backfill.`);
    let updated = 0;
    for (const product of products) {
        await (0, embeddings_1.refreshProductEmbedding)(product);
        await product.save();
        updated += 1;
        if (updated % 20 === 0) {
            console.log(`Processed ${updated}/${products.length}`);
        }
    }
    console.log(`Backfill completed. Updated ${updated} products.`);
    process.exit(0);
};
run().catch((error) => {
    console.error('Embedding backfill failed:', error);
    process.exit(1);
});
