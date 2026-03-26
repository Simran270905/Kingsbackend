// Test OTP API directly
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testOTPSend() {
  console.log('🧪 Testing OTP Send API...\n');

  try {
    const payload = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210'
    };

    console.log('📦 Sending request:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_URL}/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📊 Response status:', response.status);
    const result = await response.json();
    console.log('📋 Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ API Response Analysis:');
      console.log('Success:', result.success);
      console.log('Message:', result.message);
      console.log('Email sent:', result.emailSent);
      console.log('OTP provided:', !!result.otp);
      
      if (result.otp) {
        console.log('🔢 OTP (for testing):', result.otp);
      }
      
      if (result.debugInfo) {
        console.log('🔧 Debug info:', result.debugInfo);
      }
    } else {
      console.log('\n❌ API Error:');
      console.log('Error:', result.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOTPSend();
