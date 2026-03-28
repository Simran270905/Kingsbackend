// 🗑️ CLEAR ORDERS COLLECTION
// This script clears all orders while preserving other collections

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function clearOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get initial count
    const initialCount = await mongoose.connection.db.collection('orders').countDocuments();
    console.log(`📋 Initial orders count: ${initialCount}`);
    
    // Clear orders collection
    const result = await mongoose.connection.db.collection('orders').deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} orders`);
    
    // Verify empty
    const finalCount = await mongoose.connection.db.collection('orders').countDocuments();
    console.log(`📋 Orders remaining: ${finalCount}`);
    
    // List other collections to confirm they're preserved
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Preserved collections:');
    collections.forEach(collection => {
      if (collection.name !== 'orders') {
        console.log(`  - ${collection.name}`);
      }
    });
    
    console.log('✅ Orders reset completed successfully');
    
  } catch (error) {
    console.error('❌ Error clearing orders:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
clearOrders().catch(console.error);
