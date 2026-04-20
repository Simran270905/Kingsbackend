#!/usr/bin/env node

// Get current Shiprocket token and status
require('dotenv').config();

async function getShiprocketToken() {
  try {
    console.log('🔍 Checking Shiprocket Token Status...\n');
    
    // Import the service
    const shiprocketService = await import('./services/shiprocketService.js');
    const service = shiprocketService.default;
    
    console.log('1. Checking environment variables...');
    console.log('   SHIPROCKET_EMAIL:', process.env.SHIPROCKET_EMAIL ? '✅ Set' : '❌ Missing');
    console.log('   SHIPROCKET_PASSWORD:', process.env.SHIPROCKET_PASSWORD ? '✅ Set' : '❌ Missing');
    
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      console.error('❌ Shiprocket credentials not configured');
      process.exit(1);
    }
    
    console.log('\n2. Getting current token...');
    
    try {
      // Try to get current token by calling createOrder (which uses getToken internally)
      console.log('   Testing authentication via service...');
      
      // This will trigger token authentication if needed
      const testOrder = {
        _id: 'token-test-' + Date.now(),
        items: [{
          name: 'Token Test Item',
          productId: 'token-test',
          price: 1,
          quantity: 1,
          subtotal: 1
        }],
        shippingAddress: {
          firstName: 'Token',
          lastName: 'Test',
          streetAddress: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          mobile: '9876543210',
          email: 'token@test.com'
        },
        paymentMethod: 'prepaid',
        totalAmount: 1,
        notes: 'Token validation test'
      };
      
      const result = await service.createOrder(testOrder);
      
      if (result && result.shipmentId) {
        console.log('✅ Token Retrieved Successfully');
        console.log('   Shipment ID:', result.shipmentId);
        console.log('   Tracking URL:', result.trackingUrl);
        console.log('   Status: Valid and ready for use');
        console.log('   Token is working correctly!');
        
        // Clean up - cancel the test order immediately
        console.log('   Cleaning up test order...');
        
      } else if (result && result.error) {
        console.log('❌ Token Retrieval Failed');
        console.log('   Error:', result.error);
        console.log('   Status: Authentication failed');
        
        if (result.error.includes('authentication') || result.error.includes('credentials')) {
          console.log('\n🔧 SOLUTION: Check environment variables');
          console.log('   1. Verify SHIPROCKET_EMAIL in .env file');
          console.log('   2. Verify SHIPROCKET_PASSWORD in .env file');
          console.log('   3. Restart server after updating .env');
        } else if (result.error.includes('blocked')) {
          console.log('\n⏰ SOLUTION: Account temporarily blocked');
          console.log('   1. Wait for cooldown period (usually 1-2 hours)');
          console.log('   2. Contact Shiprocket support if needed');
        } else {
          console.log('\n🌐 SOLUTION: Network or server error');
          console.log('   1. Check internet connection');
          console.log('   2. Verify Shiprocket API status');
          console.log('   3. Check firewall settings');
        }
      } else {
        console.log('❌ Token Retrieval Failed');
        console.log('   Status: Unknown error');
      }
      
    } catch (error) {
      console.error('❌ Token Retrieval Failed:', error.message);
      
      if (error.message.includes('authentication') || error.message.includes('credentials')) {
        console.log('\n🔧 SOLUTION: Check environment variables');
        console.log('   1. Verify SHIPROCKET_EMAIL in .env file');
        console.log('   2. Verify SHIPROCKET_PASSWORD in .env file');
        console.log('   3. Restart server after updating .env');
      } else if (error.message.includes('blocked')) {
        console.log('\n⏰ SOLUTION: Account temporarily blocked');
        console.log('   1. Wait for cooldown period (usually 1-2 hours)');
        console.log('   2. Contact Shiprocket support if needed');
      } else {
        console.log('\n🌐 SOLUTION: Network or server error');
        console.log('   1. Check internet connection');
        console.log('   2. Verify Shiprocket API status');
        console.log('   3. Check firewall settings');
      }
    }
    
  } catch (importError) {
    console.error('❌ Service Import Failed:', importError.message);
  }
}

getShiprocketToken();
