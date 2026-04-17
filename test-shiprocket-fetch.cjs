#!/usr/bin/env node

// Test Shiprocket order fetching and tracking
require('dotenv').config();

async function testShiprocketFetch() {
  try {
    console.log('Testing Shiprocket order fetching and tracking...\n');
    
    // Import the shiprocket service
    const shiprocketService = await import('./services/shiprocketService.js');
    const service = shiprocketService.default;
    
    console.log('1. Testing order tracking with shipment ID...');
    
    // Test 1: Get tracking for a known shipment ID (from previous test)
    const shipmentId = '1288474195'; // From previous successful test
    
    try {
      const trackingResult = await service.getTracking(shipmentId);
      console.log('✅ Tracking result:', JSON.stringify(trackingResult, null, 2));
    } catch (trackingError) {
      console.log('❌ Tracking failed:', trackingError.message);
    }
    
    console.log('\n2. Testing AWB number retrieval...');
    
    try {
      const awbResult = await service.getAWBNumber(shipmentId);
      console.log('✅ AWB result:', JSON.stringify(awbResult, null, 2));
    } catch (awbError) {
      console.log('❌ AWB retrieval failed:', awbError.message);
    }
    
    console.log('\n3. Testing with invalid shipment ID...');
    
    // Test 2: Try with invalid shipment ID
    try {
      const invalidTracking = await service.getTracking('INVALID_SHIPMENT_ID');
      console.log('✅ Invalid tracking result:', JSON.stringify(invalidTracking, null, 2));
    } catch (invalidError) {
      console.log('❌ Invalid tracking failed (expected):', invalidError.message);
    }
    
    console.log('\n4. Testing authentication for fetch operations...');
    
    // Test 3: Verify authentication is working for fetch operations
    try {
      const token = await service.getToken();
      console.log('✅ Authentication for fetch operations successful');
      console.log('🔑 Token length:', token ? token.length : 0);
    } catch (authError) {
      console.log('❌ Authentication for fetch operations failed:', authError.message);
    }
    
    console.log('\n5. Testing rate limiting on fetch operations...');
    
    // Test 4: Multiple rapid requests to test rate limiting
    for (let i = 1; i <= 3; i++) {
      try {
        console.log(`   Attempt ${i}...`);
        const result = await service.getTracking(shipmentId);
        console.log(`   ✅ Attempt ${i} successful`);
      } catch (rateError) {
        console.log(`   ❌ Attempt ${i} failed:`, rateError.message);
        if (rateError.message.includes('wait') || rateError.message.includes('blocked')) {
          console.log('   ✅ Rate limiting is working correctly');
          break;
        }
      }
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testShiprocketFetch();
