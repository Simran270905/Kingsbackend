// Test order validation
import { validateOrder } from './utils/validation.js';

async function testOrderValidation() {
  console.log('🧪 Testing Order Validation Logic...\n');

  try {
    // Test with a sample order that mimics the UPI payment flow
    const orderData = {
      items: [
        {
          productId: 'test123',
          name: 'Test Product',
          price: 2500,
          quantity: 1,
          selectedSize: 'M',
          image: 'test.jpg',
          subtotal: 2500
        }
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        mobile: '1234567890',
        streetAddress: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '123456'
      },
      subtotal: 2500,
      discount: 0,
      couponCode: null,
      totalAmount: 2500,
      paymentMethod: 'upi',
      upiId: '8855940546-2@ybl'
    };

    console.log('📦 Testing order data:', JSON.stringify(orderData, null, 2));

    // Test validation directly
    const validation = validateOrder(orderData);
    console.log('✅ Validation result:', validation);

    // Test with missing state field (common issue)
    const orderDataMissingState = { ...orderData };
    delete orderDataMissingState.shippingAddress.state;
    
    console.log('\n📦 Testing order with missing state:');
    const validationMissingState = validateOrder(orderDataMissingState);
    console.log('❌ Validation with missing state:', validationMissingState);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOrderValidation();
