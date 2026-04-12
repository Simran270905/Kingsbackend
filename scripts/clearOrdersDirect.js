// 🗑️ CLEAR ORDERS DIRECTLY
// This script uses the same database connection as the server

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Force reliable DNS resolution
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function clearOrdersDirect() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Use the same connection options as the server
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get orders collection
    const ordersCollection = mongoose.connection.db.collection('orders');
    
    // Get initial count
    const initialCount = await ordersCollection.countDocuments();
    console.log(`📋 Initial orders count: ${initialCount}`);
    
    if (initialCount === 0) {
      console.log('✅ Orders collection is already empty');
      await mongoose.disconnect();
      return;
    }
    
    // Delete all orders
    const result = await ordersCollection.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} orders`);
    
    // Verify empty
    const finalCount = await ordersCollection.countDocuments();
    console.log(`📋 Orders remaining: ${finalCount}`);
    
    // Show other collections to confirm they're preserved
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Preserved collections:');
    for (const collection of collections) {
      if (collection.name !== 'orders') {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`  - ${collection.name}: ${count} documents`);
      }
    }
    
    console.log('✅ Orders reset completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
clearOrdersDirect().catch(console.error);
