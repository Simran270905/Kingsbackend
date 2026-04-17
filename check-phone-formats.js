#!/usr/bin/env node

/**
 * Debug Script: Check Phone Number Formats in Orders
 * 
 * This script examines phone numbers in actual orders
 * to identify format issues causing Shiprocket failures
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
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

async function checkPhoneFormats() {
  try {
    console.log('Checking Phone Number Formats in Orders');
    console.log('==========================================');
    
    // Get recent orders with payment status 'paid'
    const orders = await Order.find({ 
      paymentStatus: 'paid',
      'guestInfo.mobile': { $exists: true }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\nFound ${orders.length} paid orders with phone numbers:\n`);
    
    const phoneFormats = [];
    
    for (const order of orders) {
      const phone = order.guestInfo?.mobile;
      const email = order.guestInfo?.email;
      const name = `${order.guestInfo?.firstName} ${order.guestInfo?.lastName}`;
      
      console.log(`Order: ${order._id}`);
      console.log(`Customer: ${name}`);
      console.log(`Email: ${email}`);
      console.log(`Phone: "${phone}"`);
      console.log(`Phone Length: ${phone?.length || 0}`);
      console.log(`Phone Type: ${typeof phone}`);
      console.log(`Shiprocket Status: ${order.shippingStatus || 'N/A'}`);
      console.log(`Shipment ID: ${order.shipmentId || 'N/A'}`);
      
      if (phone) {
        // Check phone format
        const cleanPhone = phone.toString().replace(/\D/g, ''); // Remove non-digits
        const isValid10Digit = /^[0-9]{10}$/.test(cleanPhone);
        const startsWith91 = phone.toString().startsWith('91');
        const startsWith0 = phone.toString().startsWith('0');
        
        console.log(`Clean Phone: "${cleanPhone}"`);
        console.log(`Valid 10-digit: ${isValid10Digit}`);
        console.log(`Starts with 91: ${startsWith91}`);
        console.log(`Starts with 0: ${startsWith0}`);
        
        phoneFormats.push({
          phone,
          cleanPhone,
          length: phone.length,
          isValid10Digit,
          startsWith91,
          startsWith0,
          shiprocketStatus: order.shippingStatus,
          shipmentId: order.shipmentId
        });
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    }
    
    // Analyze phone format patterns
    console.log('\nPHONE FORMAT ANALYSIS:');
    console.log('======================');
    
    const formatStats = {
      total: phoneFormats.length,
      valid10Digit: phoneFormats.filter(p => p.isValid10Digit).length,
      startsWith91: phoneFormats.filter(p => p.startsWith91).length,
      startsWith0: phoneFormats.filter(p => p.startsWith0).length,
      shiprocketCreated: phoneFormats.filter(p => p.shiprocketStatus === 'created').length,
      shiprocketFailed: phoneFormats.filter(p => p.shiprocketStatus === 'failed').length
    };
    
    console.log(`Total orders: ${formatStats.total}`);
    console.log(`Valid 10-digit: ${formatStats.valid10Digit}`);
    console.log(`Starts with 91: ${formatStats.startsWith91}`);
    console.log(`Starts with 0: ${formatStats.startsWith0}`);
    console.log(`Shiprocket created: ${formatStats.shiprocketCreated}`);
    console.log(`Shiprocket failed: ${formatStats.shiprocketFailed}`);
    
    // Show problematic formats
    console.log('\nPROBLEMATIC PHONE FORMATS:');
    console.log('===========================');
    
    const problematicPhones = phoneFormats.filter(p => !p.isValid10Digit);
    problematicPhones.forEach(p => {
      console.log(`Phone: "${p.phone}" -> Clean: "${p.cleanPhone}" -> Status: ${p.shiprocketStatus}`);
    });
    
    // Show successful formats
    console.log('\nSUCCESSFUL PHONE FORMATS:');
    console.log('=========================');
    
    const successfulPhones = phoneFormats.filter(p => p.shiprocketStatus === 'created');
    successfulPhones.forEach(p => {
      console.log(`Phone: "${p.phone}" -> Clean: "${p.cleanPhone}" -> Status: ${p.shiprocketStatus}`);
    });
    
  } catch (error) {
    console.error('Debug script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the debug script
connectDB().then(() => {
  checkPhoneFormats();
});
