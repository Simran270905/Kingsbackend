// Load environment variables
require('dotenv').config();

// Test Shiprocket authentication
const shiprocketService = require('./services/shiprocketService.js').default;

async function testAuth() {
  try {
    console.log('Testing Shiprocket authentication...');
    
    // Test authentication
    const token = await shiprocketService.authenticate();
    console.log('Token:', token);
    console.log('Token length:', token.length);
    console.log('Token format check:', token.split('.').length);
    
    // Test token validation
    if (token.includes('Bearer')) {
      console.log('Token includes Bearer prefix');
    }
    
    if (token.split('.').length === 3) {
      console.log('Token looks like JWT format');
    } else {
      console.log('Token does not look like JWT format');
    }
    
  } catch (error) {
    console.error('Authentication failed:', error.message);
  }
}

testAuth();
