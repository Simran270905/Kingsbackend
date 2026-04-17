#!/usr/bin/env node

// Test different Shiprocket API endpoints
require('dotenv').config();
const axios = require('axios');

async function testShiprocketEndpoints() {
  try {
    console.log('Testing Shiprocket API endpoints...\n');
    
    // Get authentication token first
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL;
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD;
    
    console.log('1. Getting authentication token...');
    
    const authResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: shiprocketEmail,
        password: shiprocketPassword,
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');
    console.log('🔑 Token length:', token.length);
    
    // Test different endpoints
    const endpoints = [
      {
        name: 'Get Orders',
        url: 'https://apiv2.shiprocket.in/v1/external/orders',
        method: 'GET'
      },
      {
        name: 'Get Order by ID',
        url: 'https://apiv2.shiprocket.in/v1/external/orders/show/1288474195',
        method: 'GET'
      },
      {
        name: 'Get Couriers',
        url: 'https://apiv2.shiprocket.in/v1/external/couriers',
        method: 'GET'
      },
      {
        name: 'Get Pickup Locations',
        url: 'https://apiv2.shiprocket.in/v1/external/settings/company/pickup-locations',
        method: 'GET'
      }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n2. Testing ${endpoint.name}...`);
      
      try {
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        
        console.log(`✅ ${endpoint.name} successful:`, JSON.stringify(response.data, null, 2));
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} failed:`, error.response?.data?.message || error.message);
        console.log(`   Status:`, error.response?.status);
        console.log(`   URL:`, endpoint.url);
      }
    }
    
    console.log('\n3. Testing tracking with different endpoints...');
    
    // Test different tracking endpoints
    const trackingEndpoints = [
      {
        name: 'Standard Tracking',
        url: 'https://apiv2.shiprocket.in/v1/courier/track/shipment/1288474195'
      },
      {
        name: 'External Tracking',
        url: 'https://apiv2.shiprocket.in/v1/external/courier/track/shipment/1288474195'
      },
      {
        name: 'Orders Tracking',
        url: 'https://apiv2.shiprocket.in/v1/external/orders/1288474195/track'
      }
    ];
    
    for (const tracking of trackingEndpoints) {
      console.log(`\n   Testing ${tracking.name}...`);
      
      try {
        const response = await axios.get(tracking.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        
        console.log(`   ✅ ${tracking.name} successful:`, JSON.stringify(response.data, null, 2));
        
      } catch (error) {
        console.log(`   ❌ ${tracking.name} failed:`, error.response?.data?.message || error.message);
        console.log(`      Status:`, error.response?.status);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testShiprocketEndpoints();
