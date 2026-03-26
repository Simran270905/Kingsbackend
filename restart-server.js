// Restart server script
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function restartAndTest() {
  console.log('🔄 Restarting server and testing OTP...');
  
  // Wait a moment for server to restart
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test server health
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      console.log('✅ Server is running');
      
      // Test OTP with improved error handling
      const otpResponse = await fetch(`${API_URL}/otp/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890'
        })
      });
      
      console.log('OTP Status:', otpResponse.status);
      const result = await otpResponse.json();
      console.log('OTP Response:', JSON.stringify(result, null, 2));
      
      if (result.data?.debugInfo?.needsAppPassword) {
        console.log('\n🔧 Gmail App Password Instructions:');
        console.log('1. Enable 2-factor authentication on your Gmail account');
        console.log('2. Go to: https://myaccount.google.com/apppasswords');
        console.log('3. Generate a new App Password');
        console.log('4. Update EMAIL_PASS in .env with the new App Password');
        console.log('5. Restart the server');
      }
    } else {
      console.log('❌ Server not responding');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

restartAndTest();
