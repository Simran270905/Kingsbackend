// Test with real email address
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5003/api';

async function testRealEmail() {
  console.log('🧪 Testing OTP with Real Email...\n');

  try {
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
      console.log('🔢 Then test with: node test-verify-real.js');
    } else {
      console.log('❌ Email failed - checking SMTP configuration...');
      
      // Test SMTP configuration
      console.log('\n🔧 Testing SMTP configuration...');
      console.log('EMAIL_USER:', process.env.EMAIL_USER);
      console.log('SMTP_HOST:', process.env.SMTP_HOST);
      console.log('SMTP_PORT:', process.env.SMTP_PORT);
      console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length || 0);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealEmail();
