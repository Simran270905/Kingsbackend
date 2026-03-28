// 🔍 CHECK TEST DATA
// This script shows all current test data in the database

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Force reliable DNS resolution
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function checkTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const collections = ['products', 'orders', 'users', 'categories', 'coupons', 'brands'];
    
    console.log('\n📊 CURRENT TEST DATA STATUS:');
    console.log('================================');
    
    for (const collectionName of collections) {
      try {
        const Collection = mongoose.connection.db.collection(collectionName);
        const count = await Collection.countDocuments();
        
        console.log(`\n📦 ${collectionName.toUpperCase()}: ${count} documents`);
        
        if (count > 0) {
          if (collectionName === 'products') {
            const products = await Collection.find().limit(5).toArray();
            console.log('🛍️ Sample products:');
            products.forEach((product, index) => {
              console.log(`  ${index + 1}. ${product.name}`);
              console.log(`     Price: ₹${product.price || 0}`);
              console.log(`     Stock: ${product.stock || 0}`);
              console.log(`     SKU: ${product.sku || 'N/A'}`);
              console.log(`     Category: ${product.category || 'N/A'}`);
            });
          } else if (collectionName === 'orders') {
            const orders = await Collection.find().limit(5).toArray();
            console.log('📋 Sample orders:');
            orders.forEach((order, index) => {
              console.log(`  ${index + 1}. Order ID: ${order._id}`);
              console.log(`     Customer: ${order.customer?.name || 'Guest User'}`);
              console.log(`     Email: ${order.customer?.email || 'N/A'}`);
              console.log(`     Phone: ${order.customer?.phone || 'N/A'}`);
              console.log(`     Amount: ₹${order.totalAmount || 0}`);
              console.log(`     Payment: ${order.paymentMethod || 'N/A'}`);
              console.log(`     Status: ${order.status || 'N/A'}`);
              console.log(`     Payment Status: ${order.paymentStatus || 'N/A'}`);
              console.log(`     Created: ${order.createdAt || 'N/A'}`);
            });
          } else if (collectionName === 'users') {
            const users = await Collection.find().limit(3).toArray();
            console.log('👤 Sample users:');
            users.forEach((user, index) => {
              console.log(`  ${index + 1}. User ID: ${user._id}`);
              console.log(`     Name: ${user.name || 'N/A'}`);
              console.log(`     Email: ${user.email || 'N/A'}`);
              console.log(`     Mobile: ${user.mobile || 'N/A'}`);
            });
          } else if (collectionName === 'categories') {
            const categories = await Collection.find().limit(5).toArray();
            console.log('📂 Sample categories:');
            categories.forEach((category, index) => {
              console.log(`  ${index + 1}. ${category.name}`);
              console.log(`     Description: ${category.description || 'N/A'}`);
            });
          } else if (collectionName === 'coupons') {
            const coupons = await Collection.find().limit(3).toArray();
            console.log('🎫 Sample coupons:');
            coupons.forEach((coupon, index) => {
              console.log(`  ${index + 1}. Code: ${coupon.code}`);
              console.log(`     Discount: ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : ''}`);
              console.log(`     Valid Until: ${coupon.validUntil || 'N/A'}`);
              console.log(`     Usage: ${coupon.usedCount || 0}/${coupon.usageLimit || '∞'}`);
            });
          } else if (collectionName === 'brands') {
            const brands = await Collection.find().limit(3).toArray();
            console.log('🏷️ Sample brands:');
            brands.forEach((brand, index) => {
              console.log(`  ${index + 1}. ${brand.name || brand.brandName || 'N/A'}`);
              console.log(`     Description: ${brand.description || 'N/A'}`);
            });
          }
        } else {
          console.log(`  No documents in ${collectionName}`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 TEST DATA CHECK COMPLETED');
    console.log('================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkTestData().catch(console.error);
