#!/usr/bin/env node

// Test Shiprocket account blocking and recovery
require('dotenv').config();

async function testShiprocketBlocking() {
  try {
    console.log('Testing Shiprocket account blocking and recovery...\n');
    
    // Import the shiprocket service
    const shiprocketService = await import('./services/shiprocketService.js');
    const service = shiprocketService.default;
    
    console.log('1. Testing authentication with current credentials...');
    
    // Test 1: Try to create a test order
    const testOrder = {
      _id: 'test-blocking-' + Date.now(),
      items: [{
        name: 'Test Jewelry',
        productId: 'test-product-123',
        price: 999,
        quantity: 1,
        subtotal: 999
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        streetAddress: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        mobile: '9876543210',
        email: 'test@example.com'
      },
      paymentMethod: 'prepaid',
      totalAmount: 999,
      notes: 'Test blocking recovery'
    };
    
    try {
      const result = await service.createOrder(testOrder);
      console.log('✅ Order creation successful:', result.shipmentId);
    } catch (error) {
      console.log('❌ Order creation failed:', error.message);
      
      // Test 2: Try retry to see if blocking is detected
      console.log('\n2. Testing retry mechanism...');
      try {
        const retryResult = await service.createOrder(testOrder);
        console.log('✅ Retry successful:', retryResult.shipmentId);
      } catch (retryError) {
        console.log('❌ Retry failed:', retryError.message);
        
        // Test 3: Check if cooldown is working
        console.log('\n3. Testing cooldown mechanism...');
        try {
          const thirdAttempt = await service.createOrder(testOrder);
          console.log('✅ Third attempt successful:', thirdAttempt.shipmentId);
        } catch (thirdError) {
          console.log('❌ Third attempt failed:', thirdError.message);
          
          // Check if it's a blocking error
          if (thirdError.message.includes('blocked') || thirdError.message.includes('wait')) {
            console.log('✅ Account blocking detection working correctly');
            console.log('🕐 Cooldown message:', thirdError.message);
          } else {
            console.log('⚠️ Unexpected error type');
          }
        }
      }
    }
    
    console.log('\n4. Testing retryOrderCreation method...');
    try {
      const retryResult = await service.retryOrderCreation(testOrder);
      console.log('✅ Retry order creation successful:', retryResult.shipmentId);
    } catch (retryError) {
      console.log('❌ Retry order creation failed:', retryError.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testShiprocketBlocking();
