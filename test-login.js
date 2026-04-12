// Test login endpoint
import axios from 'axios';

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/customers/login', {
      email: 'simrankadamkb12@gmail.com'
    });
    
    console.log('Login response:', response.data);
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
  }
}

testLogin();
