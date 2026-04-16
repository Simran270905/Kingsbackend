#!/usr/bin/env node

// Test password with special character
require('dotenv').config();
const axios = require('axios');

async function testPasswordIssue() {
  try {
    console.log('Testing password with special character...\n');
    
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL;
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD;
    
    console.log('Email:', shiprocketEmail);
    console.log('Password:', shiprocketPassword);
    console.log('Password ends with %:', shiprocketPassword.endsWith('%'));
    
    if (!shiprocketEmail || !shiprocketPassword) {
      console.error('Credentials not found');
      process.exit(1);
    }
    
    console.log('\nTesting with original password...');
    
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
    
  } catch (error) {
    console.error('Authentication failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data?.message || error.message);
    console.error('Details:', error.response?.data || null);
  }
}

testPasswordIssue();
