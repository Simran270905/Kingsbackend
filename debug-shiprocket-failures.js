#!/usr/bin/env node

/**
 * Debug Script: Check Shiprocket Failure Reasons
 * 
 * This script examines orders with failed Shiprocket status
 * to identify the root cause of failures
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from './models/Order.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

async function debugShiprocketFailures() {
  try {
    console.log('🔍 Debugging Shiprocket Failures');
    console.log('==================================');
    
    // Find all orders with failed shipping status
    const failedOrders = await Order.find({
      $or: [
        { shippingStatus: 'failed' },
        { shiprocketError: { $exists: true, $ne: null } }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n📊 Found ${failedOrders.length} orders with Shiprocket failures:\n`);
    
    for (const order of failedOrders) {
      console.log(`🔍 Order ID: ${order._id}`);
      console.log(`📅 Created: ${order.createdAt}`);
      console.log(`💰 Amount: ₹${order.totalAmount}`);
      console.log(`💳 Payment Status: ${order.paymentStatus}`);
      console.log(`📦 Shipping Status: ${order.shippingStatus}`);
      console.log(`🚚 Shipment ID: ${order.shipmentId || 'N/A'}`);
      
      // Show customer info
      if (order.guestInfo) {
        console.log(`👤 Customer: ${order.guestInfo.firstName} ${order.guestInfo.lastName}`);
        console.log(`📧 Email: ${order.guestInfo.email}`);
        console.log(`📱 Phone: ${order.guestInfo.mobile}`);
        console.log(`🏠 Address: ${order.guestInfo.streetAddress}, ${order.guestInfo.city}, ${order.guestInfo.state} - ${order.guestInfo.zipCode}`);
      } else if (order.customer) {
        console.log(`👤 Customer: ${order.customer.name || 'N/A'}`);
        console.log(`📧 Email: ${order.customer.email || 'N/A'}`);
        console.log(`📱 Phone: ${order.customer.phone || 'N/A'}`);
      }
      
      // Show Shiprocket error
      if (order.shiprocketError) {
        console.log(`❌ Shiprocket Error: ${order.shiprocketError}`);
      }
      
      // Show notes
      if (order.notes) {
        console.log(`📝 Notes: ${order.notes}`);
      }
      
      // Show retry count
      if (order.shiprocketRetries) {
        console.log(`🔄 Retry Count: ${order.shiprocketRetries}`);
      }
      
      // Show items
      console.log(`📦 Items: ${order.items.length} items`);
      order.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ₹${item.price} x ${item.quantity}`);
      });
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
    // Check successful orders for comparison
    const successfulOrders = await Order.find({
      shippingStatus: 'created',
      shipmentId: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 }).limit(3);
    
    console.log(`\n✅ Found ${successfulOrders.length} successful orders for comparison:\n`);
    
    for (const order of successfulOrders) {
      console.log(`🎉 Order ID: ${order._id}`);
      console.log(`📅 Created: ${order.createdAt}`);
      console.log(`💰 Amount: ₹${order.totalAmount}`);
      console.log(`📦 Shipping Status: ${order.shippingStatus}`);
      console.log(`🚚 Shipment ID: ${order.shipmentId}`);
      console.log(`📦 AWB Code: ${order.awbCode || 'N/A'}`);
      console.log(`🚚 Courier: ${order.courierName || 'N/A'}`);
      
      if (order.guestInfo) {
        console.log(`👤 Customer: ${order.guestInfo.firstName} ${order.guestInfo.lastName}`);
        console.log(`📱 Phone: ${order.guestInfo.mobile}`);
        console.log(`🏠 Address: ${order.guestInfo.city}, ${order.guestInfo.state} - ${order.guestInfo.zipCode}`);
      }
      
      console.log('\n' + '-'.repeat(50) + '\n');
    }
    
    // Summary statistics
    const totalOrders = await Order.countDocuments();
    const failedCount = await Order.countDocuments({ shippingStatus: 'failed' });
    const createdCount = await Order.countDocuments({ shippingStatus: 'created' });
    const pendingCount = await Order.countDocuments({ shippingStatus: 'pending_payment' });
    
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`Total Orders: ${totalOrders}`);
    console.log(`Failed Shiprocket: ${failedCount} (${((failedCount/totalOrders)*100).toFixed(1)}%)`);
    console.log(`Successful Shiprocket: ${createdCount} (${((createdCount/totalOrders)*100).toFixed(1)}%)`);
    console.log(`Pending Payment: ${pendingCount} (${((pendingCount/totalOrders)*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug script
connectDB().then(() => {
  debugShiprocketFailures();
});
