require('dotenv').config();
const axios = require('axios');

console.log('=== VERIFYING SHIPROCKET AUTHENTICATION ===\n');

// Test the hardened authentication directly
async function testAuth() {
  try {
    console.log('🔐 Testing Shiprocket API User authentication...');
    
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_API_EMAIL,
      password: process.env.SHIPROCKET_API_PASSWORD
    }, {
      timeout: 15000
    });
    
    if (response.data && response.data.token) {
      console.log('✅ SUCCESS: Shiprocket API User authenticated!');
      console.log('🔑 Token received:', response.data.token.substring(0, 20) + '...');
      console.log('👤 User ID:', response.data.id);
      console.log('🏢 Company ID:', response.data.company_id);
      
      // Test if token works for API calls
      console.log('\n📡 Testing token with API call...');
      const testResponse = await axios.get('https://apiv2.shiprocket.in/v1/external/courier/serviceability', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        },
        params: {
          pickup_postcode: '400001',
          delivery_postcode: '110001',
          weight: 0.5,
          cod: 0
        },
        timeout: 15000
      });
      
      console.log('✅ SUCCESS: Token works for API calls!');
      console.log('📦 Available couriers:', testResponse.data.data?.length || 0);
      
      return true;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.response?.data?.message || error.message);
    return false;
  }
}

testAuth().then(success => {
  console.log(`\n🎯 FINAL RESULT: ${success ? 'WORKING' : 'NOT WORKING'}`);
});
