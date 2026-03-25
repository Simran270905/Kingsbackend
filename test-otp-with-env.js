// Test OTP with proper environment loading
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const API_URL = 'http://localhost:5003/api';

async function testOTPWithEnv() {
  console.log('🧪 Testing OTP with Environment Variables...\n');

  try {
    // Check environment variables
    console.log('🔧 Environment Variables:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length || 0);
    console.log('');

    // Test with your actual email
    console.log('📤 Sending OTP to simrankadamkb12@gmail.com...');
    const response = await fetch(`${API_URL}/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Simran Kadam',
        email: 'simrankadamkb12@gmail.com'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('🎉 EMAIL SENT SUCCESSFULLY!');
      console.log('📧 Check your inbox for the OTP code');
      console.log('🔢 The OTP should arrive in the next few seconds');
    } else {
      console.log('❌ Email failed with status:', response.status);
      console.log('Error:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOTPWithEnv();
