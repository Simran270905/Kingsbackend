// Test final login API
import axios from 'axios';

async function testFinalLogin() {
  try {
    console.log('Testing FINAL login API...');
    
    const response = await axios.post('https://api.kkingsjewellery.com/api/customers/login', {
      email: 'simrankadamkb12@gmail.com'
    });
    
    console.log('FINAL API Response:', response.data);
    console.log('SUCCESS STATUS:', response.status);
    console.log('HAS TOKEN:', !!response.data.data?.token);
    console.log('HAS USER:', !!response.data.data?.user);
    
  } catch (error) {
    console.error('FINAL API Error:', error.response?.data || error.message);
  }
}

testFinalLogin();
