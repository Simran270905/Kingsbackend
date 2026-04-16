#!/usr/bin/env node

// Test Shiprocket retry with debugging
require('dotenv').config();

async function testRetry() {
  try {
    console.log('Testing Shiprocket retry with debugging...\n');
    
    // Import the shiprocket service
    const shiprocketService = await import('./services/shiprocketService.js');
    const service = shiprocketService.default;
    
    console.log('Service instance:', !!service);
    console.log('retryOrderCreation method:', typeof service.retryOrderCreation);
    
    // Create a mock order
    const mockOrder = {
      _id: 'test-order-' + Date.now(),
      shiprocketRetries: 0,
      lastShiprocketRetry: null,
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
      notes: 'Test retry'
    };
    
    console.log('\nCalling retryOrderCreation...');
    const result = await service.retryOrderCreation(mockOrder);
    
    console.log('\nResult:', result);
    
  } catch (error) {
    console.error('Retry test failed:', error.message);
    console.error('Full error:', error);
  }
}

testRetry();
