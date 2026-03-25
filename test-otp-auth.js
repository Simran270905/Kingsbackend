// Test script for OTP authentication
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5003/api';

async function testOTPAuth() {
  console.log('🧪 Testing OTP Authentication System...\n');

  try {
    // Test 1: Send OTP
    console.log('📤 Testing Send OTP...');
    const sendOTPResponse = await fetch(`${API_URL}/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com'
      })
    });

    const sendOTPResult = await sendOTPResponse.json();
    console.log('Status:', sendOTPResponse.status);
    console.log('Response:', sendOTPResult);
    console.log('');

    if (sendOTPResponse.ok) {
      console.log('✅ OTP sent successfully!');
      
      // Test 2: Verify OTP (with dummy OTP - will fail but shows the endpoint works)
      console.log('🔐 Testing Verify OTP...');
      const verifyOTPResponse = await fetch(`${API_URL}/otp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          otp: '123456'
        })
      });

      const verifyOTPResult = await verifyOTPResponse.json();
      console.log('Status:', verifyOTPResponse.status);
      console.log('Response:', verifyOTPResult);
      console.log('');

      if (verifyOTPResponse.status === 400 && verifyOTPResult.message.includes('Invalid OTP')) {
        console.log('✅ OTP verification endpoint working (expected failure with dummy OTP)');
      }
    }

    console.log('🎉 OTP Authentication System Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Configure EMAIL_USER and EMAIL_PASS in .env for actual email sending');
    console.log('2. Test with real email/phone numbers');
    console.log('3. Integrate SMS service for phone OTP (optional)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOTPAuth();
