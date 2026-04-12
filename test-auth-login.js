// Test auth login endpoint
import axios from 'axios';

async function testAuthLogin() {
  try {
    console.log('Testing /api/auth/login endpoint...');
    
    const response = await axios.post('https://api.kkingsjewellery.com/api/auth/login', {
      email: 'simrankadamkb12@gmail.com'
    });
    
    console.log('Auth Login response:', response.data);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
  } catch (error) {
    console.error('Auth Login error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testAuthLogin();
