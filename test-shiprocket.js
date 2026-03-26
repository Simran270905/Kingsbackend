// Shiprocket Diagnostic Tool
import shiprocketService from './services/shiprocketService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseShiprocket() {
  console.log('🔍 Diagnosing Shiprocket Service...\n');

  try {
    // Step 1: Check configuration
    console.log('1️⃣ Checking Configuration...');
    console.log('SHIPROCKET_EMAIL:', process.env.SHIPROCKET_EMAIL ? '✅ Configured' : '❌ Missing');
    console.log('SHIPROCKET_PASSWORD:', process.env.SHIPROCKET_PASSWORD ? '✅ Configured' : '❌ Missing');
    console.log('SHIPROCKET_CHANNEL_ID:', process.env.SHIPROCKET_CHANNEL_ID ? '✅ Configured' : '❌ Missing');
    console.log('SHIPROCKET_PICKUP_LOCATION:', process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary');

    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      console.log('\n❌ Shiprocket credentials not configured');
      return;
    }

    // Step 2: Test authentication
    console.log('\n2️⃣ Testing Authentication...');
    try {
      const token = await shiprocketService.authenticate();
      console.log('✅ Authentication successful');
      console.log('Token length:', token.length);
    } catch (error) {
      console.log('❌ Authentication failed:', error.message);
      console.log('Possible causes:');
      console.log('- Invalid email/password');
      console.log('- Shiprocket API down');
      console.log('- Network connectivity issues');
      return;
    }

    // Step 3: Test order creation with sample data
    console.log('\n3️⃣ Testing Order Creation...');
    const sampleOrder = {
      _id: 'test-order-123',
      items: [
        {
          name: 'Test Diamond Ring',
          productId: 'test-product-123',
          quantity: 1,
          price: 2500,
          discountPercentage: 0
        }
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        streetAddress: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        mobile: '9876543210',
        email: 'john@example.com'
      },
      paymentMethod: 'cod',
      subtotal: 2500,
      totalAmount: 2500,
      shippingCost: 0,
      discount: 0
    };

    try {
      const result = await shiprocketService.createOrder(sampleOrder);
      
      if (result.status === 'created') {
        console.log('✅ Order creation successful');
        console.log('Shipment ID:', result.shipmentId);
        console.log('Tracking URL:', result.trackingUrl);
        console.log('Courier:', result.courierName);
        console.log('Estimated Delivery:', result.estimatedDelivery);
      } else {
        console.log('❌ Order creation failed');
        console.log('Error:', result.error);
        console.log('Details:', result.details);
        
        // Analyze specific errors
        if (result.error?.includes('pickup_location')) {
          console.log('\n💡 Pickup Location Issue:');
          console.log('- Check if pickup location is configured in Shiprocket dashboard');
          console.log('- Verify pickup address is added in Shiprocket settings');
        }
        
        if (result.error?.includes('channel_id')) {
          console.log('\n💡 Channel ID Issue:');
          console.log('- Verify channel ID is correct');
          console.log('- Check if channel is active in Shiprocket');
        }
        
        if (result.error?.includes('pincode')) {
          console.log('\n💡 Pincode Service Issue:');
          console.log('- Shiprocket may not deliver to this pincode');
          console.log('- Check if pincode is serviceable in Shiprocket dashboard');
        }
      }
    } catch (error) {
      console.log('❌ Order creation error:', error.message);
    }

    // Step 4: Test tracking (if we have a shipment ID)
    console.log('\n4️⃣ Testing Tracking API...');
    try {
      const trackingResult = await shiprocketService.getTracking('test-shipment-id');
      console.log('Tracking API response:', trackingResult);
    } catch (error) {
      console.log('Tracking API test (expected to fail with test ID):', error.message);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

diagnoseShiprocket();
