// 🛍️ CREATE SAMPLE PRODUCTS FOR TESTING
// This script creates sample products for order flow testing

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// Load environment variables
dotenv.config();

// Force reliable DNS resolution
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function createSampleProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get existing categories
    const categories = await Category.find();
    console.log(`📋 Found ${categories.length} categories`);
    
    if (categories.length === 0) {
      console.log('⚠️ No categories found. Creating sample categories first...');
      
      // Create sample categories
      const sampleCategories = [
        { name: 'Chains', description: 'Beautiful chains for every occasion' },
        { name: 'Rings', description: 'Elegant rings for all styles' },
        { name: 'Earrings', description: 'Stunning earrings to complete your look' }
      ];
      
      const createdCategories = await Category.insertMany(sampleCategories);
      console.log(`✅ Created ${createdCategories.length} sample categories`);
      categories.push(...createdCategories);
    }
    
    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing products`);
    
    // Create sample products
    const sampleProducts = [
      {
        name: 'Classic Gold Chain',
        description: 'A timeless gold chain perfect for everyday wear',
        category: categories[0]?.name || 'Chains',
        brand: 'KKings',
        price: 2500,
        originalPrice: 3000,
        selling_price: 2500,
        purchasePrice: 1500,
        stock: 10,
        images: [
          'https://res.cloudinary.com/dkbxrhe1v/image/upload/v1774169422/kkings-jewellery/tbyq2wgnvxxvqkaw2hgr.jpg'
        ],
        sku: 'CHAIN-001',
        tags: ['gold', 'chain', 'classic'],
        status: 'active'
      },
      {
        name: 'Diamond Ring',
        description: 'Elegant diamond ring with brilliant cut stone',
        category: categories[1]?.name || 'Rings',
        brand: 'KKings',
        price: 5000,
        originalPrice: 6500,
        selling_price: 5000,
        purchasePrice: 3000,
        stock: 5,
        images: [
          'https://res.cloudinary.com/dkbxrhe1v/image/upload/v1774169777/kkings-jewellery/jwivcdxwdulx6jt8b1h0.jpg'
        ],
        sku: 'RING-001',
        tags: ['diamond', 'ring', 'elegant'],
        status: 'active'
      },
      {
        name: 'Silver Earrings',
        description: 'Beautiful silver earrings with modern design',
        category: categories[2]?.name || 'Earrings',
        brand: 'KKings',
        price: 1200,
        originalPrice: 1500,
        selling_price: 1200,
        purchasePrice: 800,
        stock: 15,
        images: [
          'https://res.cloudinary.com/dkbxrhe1v/image/upload/v1774169422/kkings-jewellery/v1g8ttclop7p4jg2hoza.jpg'
        ],
        sku: 'EARR-001',
        tags: ['silver', 'earrings', 'modern'],
        status: 'active'
      },
      {
        name: 'Platinum Bracelet',
        description: 'Luxurious platinum bracelet with intricate design',
        category: categories[0]?.name || 'Chains',
        brand: 'KKings',
        price: 8000,
        originalPrice: 10000,
        selling_price: 8000,
        purchasePrice: 5000,
        stock: 3,
        images: [
          'https://res.cloudinary.com/dkbxrhe1v/image/upload/v1774169422/kkings-jewellery/tbyq2wgnvxxvqkaw2hgr.jpg'
        ],
        sku: 'BRACE-001',
        tags: ['platinum', 'bracelet', 'luxury'],
        status: 'active'
      },
      {
        name: 'Rose Gold Pendant',
        description: 'Delicate rose gold pendant with elegant design',
        category: categories[1]?.name || 'Rings',
        brand: 'KKings',
        price: 3500,
        originalPrice: 4000,
        selling_price: 3500,
        purchasePrice: 2200,
        stock: 8,
        images: [
          'https://res.cloudinary.com/dkbxrhe1v/image/upload/v1774169777/kkings-jewellery/jwivcdxwdulx6jt8b1h0.jpg'
        ],
        sku: 'PEND-001',
        tags: ['rose-gold', 'pendant', 'delicate'],
        status: 'active'
      }
    ];
    
    // Insert sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${createdProducts.length} sample products`);
    
    // Display created products
    console.log('\n📦 Created Products:');
    createdProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - ₹${product.price} (Stock: ${product.stock})`);
      console.log(`     SKU: ${product.sku}`);
      console.log(`     Category: ${product.category}`);
    });
    
    console.log('\n🎉 Sample products created successfully!');
    console.log('📋 Ready for order flow testing');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the product creation
createSampleProducts().catch(console.error);
