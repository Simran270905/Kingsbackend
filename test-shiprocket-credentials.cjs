#!/usr/bin/env node

// Test Shiprocket credentials
require('dotenv').config();
const axios = require('axios');

async function testShiprocketCredentials() {
  try {
    console.log('Testing Shiprocket credentials...\n');
    
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL;
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD;
    
    console.log('Email:', shiprocketEmail);
    console.log('Password:', shiprocketPassword ? 'SET' : 'NOT SET');
    console.log('Password length:', shiprocketPassword ? shiprocketPassword.length : 0);
    
    if (!shiprocketEmail || !shiprocketPassword) {
      console.error('Credentials not found in environment variables');
      process.exit(1);
    }
    
    console.log('\nAttempting authentication...');
    
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: shiprocketEmail,
        password: shiprocketPassword,
      },
      {
        timeout: 15000
      }
    );
    
    console.log('Authentication successful!');
    console.log('Token:', response.data.token ? 'RECEIVED' : 'NOT RECEIVED');
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('Authentication failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data?.message || error.message);
    console.error('Details:', error.response?.data || null);
  }
}

testShiprocketCredentials();
