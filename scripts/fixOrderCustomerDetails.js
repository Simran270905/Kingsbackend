// 🔧 FIX ORDER CUSTOMER DETAILS - DATABASE MIGRATION
// This script fixes existing orders that don't have customer details

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import connectDB from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixOrderCustomerDetails() {
  try {
    console.log('🔧 Starting order customer details migration...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Find orders without customer field
    const ordersWithoutCustomer = await Order.find({ 
      customer: { $exists: false } 
    });
    
    console.log(`📋 Found ${ordersWithoutCustomer.length} orders without customer details`);
    
    if (ordersWithoutCustomer.length === 0) {
      console.log('✅ All orders already have customer details');
      return;
    }
    
    // Update orders without customer details
    const updateResult = await Order.updateMany(
      { customer: { $exists: false } },
      {
        $set: {
          customer: {
            name: "Guest User",
            email: "N/A",
            phone: "N/A",
            firstName: "Guest",
            lastName: "User",
            mobile: "N/A"
          },
          shippingAddress: {
            firstName: "Guest",
            lastName: "User",
            email: "N/A",
            mobile: "N/A",
            streetAddress: "N/A",
            city: "",
            state: "",
            zipCode: ""
          }
        }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} orders with customer details`);
    
    // Also fix orders with empty customer field
    const emptyCustomerOrders = await Order.find({ 
      customer: { $exists: true, $eq: {} } 
    });
    
    if (emptyCustomerOrders.length > 0) {
      const emptyUpdateResult = await Order.updateMany(
        { customer: { $exists: true, $eq: {} } },
        {
          $set: {
            customer: {
              name: "Guest User",
              email: "N/A",
              phone: "N/A",
              firstName: "Guest",
              lastName: "User",
              mobile: "N/A"
            }
          }
        }
      );
      
      console.log(`✅ Fixed ${emptyUpdateResult.modifiedCount} orders with empty customer field`);
    }
    
    // Fix orders without shippingAddress
    const ordersWithoutShipping = await Order.find({ 
      shippingAddress: { $exists: false } 
    });
    
    if (ordersWithoutShipping.length > 0) {
      const shippingUpdateResult = await Order.updateMany(
        { shippingAddress: { $exists: false } },
        {
          $set: {
            shippingAddress: {
              firstName: "Guest",
              lastName: "User",
              email: "N/A",
              mobile: "N/A",
              streetAddress: "N/A",
              city: "",
              state: "",
              zipCode: ""
            }
          }
        }
      );
      
      console.log(`✅ Fixed ${shippingUpdateResult.modifiedCount} orders without shipping address`);
    }
    
    console.log('🎉 Order customer details migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the migration
fixOrderCustomerDetails().catch(console.error);
