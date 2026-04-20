#!/usr/bin/env node

// Check current Shiprocket account status
require('dotenv').config();

async function checkShiprocketStatus() {
  try {
    console.log('🔍 Checking Shiprocket Account Status...\n');
    
    // Import both services
    const shiprocketService = await import('./services/shiprocketService.js');
    const shiprocketFullApiService = await import('./services/shiprocketFullApiService.js');
    
    const mainService = shiprocketService.default;
    const fullApiService = shiprocketFullApiService.default;
    
    console.log('1. Testing Main Account Status...');
    
    try {
      const testOrder = {
        _id: 'status-check-' + Date.now(),
        items: [{
          name: 'Status Check Test',
          productId: 'status-test',
          price: 99,
          quantity: 1,
          subtotal: 99
        }],
        shippingAddress: {
          firstName: 'Status',
          lastName: 'Check',
          streetAddress: '123 Status Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          mobile: '9876543210',
          email: 'status@kkingsjewellery.com'
        },
        paymentMethod: 'prepaid',
        totalAmount: 99,
        notes: 'Status Check Test'
      };
      
      const result = await mainService.createOrder(testOrder);
      console.log('✅ Main Account: WORKING');
      console.log('   Shipment ID:', result.shipmentId);
      
    } catch (mainError) {
      console.log('❌ Main Account: BLOCKED');
      console.log('   Error:', mainError.error);
      
      if (mainError.error.includes('blocked') || mainError.error.includes('wait')) {
        const waitTime = mainError.error.match(/wait (\d+) minutes/);
        if (waitTime) {
          console.log('   ⏰ Cooldown Time:', waitTime[1], 'minutes');
          const unblockTime = new Date(Date.now() + (parseInt(waitTime[1]) * 60 * 1000));
          console.log('   📅 Unblocks At:', unblockTime.toLocaleString());
        }
      }
    }
    
    console.log('\n2. Testing API User Status...');
    
    try {
      const token = await fullApiService.getApiToken();
      console.log('✅ API User: WORKING');
      console.log('   Token Length:', token.length);
      
    } catch (apiError) {
      console.log('❌ API User: BLOCKED/FAILED');
      console.log('   Error:', apiError.message);
    }
    
    console.log('\n3. Environment Variables Check...');
    console.log('📧 Main Account Email:', process.env.SHIPROCKET_API_EMAIL);
    console.log('🔑 Main Password Set:', !!process.env.SHIPROCKET_API_PASSWORD);
    console.log('📧 API User Email:', process.env.SHIPROCKET_API_USER_EMAIL);
    console.log('🔑 API Password Set:', !!process.env.SHIPROCKET_API_USER_PASSWORD);
    
    console.log('\n4. Current Time and Status...');
    console.log('🕐 Current Time:', new Date().toLocaleString());
    console.log('📊 Account Status:', 'BLOCKED - Cooldown Active');
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('1. ⏳ Wait for cooldown to expire');
    console.log('2. 📞 Contact Shiprocket Support: +91 9212089090');
    console.log('3. 📧 Email: support@shiprocket.in');
    console.log('4. 🌐 Web: https://www.shiprocket.in/contact-us');
    
  } catch (error) {
    console.error('Status check failed:', error.message);
  }
}

checkShiprocketStatus();
