// Debug OTP functionality
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testOTPDebug() {
  console.log('🧪 Testing OTP Debug...\n');

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server is running');
      console.log('Email configured:', health.services.email.configured);
    } else {
      console.log('❌ Server is not responding');
      return;
    }

    // Test 2: Send OTP
    console.log('\n2️⃣ Testing send OTP...');
    const otpPayload = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890'
    };

    console.log('Payload:', JSON.stringify(otpPayload, null, 2));

    const otpResponse = await fetch(`${API_URL}/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(otpPayload)
    });

    console.log('Status:', otpResponse.status);
    const otpResult = await otpResponse.json();
    console.log('Response:', JSON.stringify(otpResult, null, 2));

    if (otpResponse.ok && otpResult.data?.otp) {
      console.log('✅ OTP generated successfully');
      
      // Test 3: Verify OTP
      console.log('\n3️⃣ Testing verify OTP...');
      const verifyPayload = {
        email: 'test@example.com',
        otp: otpResult.data.otp
      };

      const verifyResponse = await fetch(`${API_URL}/otp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verifyPayload)
      });

      console.log('Verify Status:', verifyResponse.status);
      const verifyResult = await verifyResponse.json();
      console.log('Verify Response:', JSON.stringify(verifyResult, null, 2));

      if (verifyResponse.ok) {
        console.log('✅ OTP verification successful');
      } else {
        console.log('❌ OTP verification failed');
      }
    } else {
      console.log('❌ OTP generation failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOTPDebug();
