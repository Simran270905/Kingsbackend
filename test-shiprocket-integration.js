#!/usr/bin/env node

/**
 * Shiprocket Integration Test Script
 * 
 * This script tests the Shiprocket API integration
 * Usage: node test-shiprocket-integration.js
 */

import dotenv from 'dotenv';
import { testShiprocketIntegration, getTokenStatus } from './services/shiprocketTestService.js';

// Load environment variables
dotenv.config();

console.log('🚀 Starting Shiprocket Integration Test');
console.log('=====================================');

// Check if credentials are set
const email = process.env.SHIPROCKET_API_EMAIL;
const password = process.env.SHIPROCKET_API_PASSWORD;

if (!email || !password) {
  console.error('❌ Shiprocket credentials not found in environment variables');
  console.log('Please ensure SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD are set in .env file');
  process.exit(1);
}

console.log('✅ Shiprocket credentials found');
console.log(`📧 Email: ${email}`);
console.log(`🔑 Password: ${password ? '***' : 'NOT SET'}`);
console.log('');

async function runTest() {
  try {
    // Show initial token status
    console.log('📊 Initial Token Status:');
    const initialStatus = getTokenStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log('');

    // Run the integration test
    console.log('🧪 Running Integration Test:');
    const result = await testShiprocketIntegration();
    
    console.log('');
    console.log('📋 Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('');
      console.log('🎉 SUCCESS: Shiprocket integration is working!');
      console.log('✅ Login: Successful');
      console.log('✅ Order Creation: Successful');
      console.log('✅ Token Management: Working');
    } else {
      console.log('');
      console.log('💥 FAILURE: Shiprocket integration test failed');
      console.log('❌ Error:', result.message);
      console.log('❌ Details:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runTest();
