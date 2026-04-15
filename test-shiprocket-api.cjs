// Load environment variables
require('dotenv').config();
const axios = require('axios');

async function testShiprocketAPI() {
  try {
    console.log('Testing Shiprocket API directly...');
    
    const apiKey = process.env.SHIPROCKET_API_KEY;
    console.log('API Key:', apiKey);
    
    // Try to authenticate with API key
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('API test failed:', error.response?.data || error.message);
  }
}

testShiprocketAPI();
