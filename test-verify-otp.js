// Test OTP verification
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testOTPVerification() {
  console.log('🧪 Testing OTP Verification...\n');

  try {
    // Use the OTP from the previous test (964223)
    const verifyPayload = {
      email: 'simrankadamkb12@gmail.com',
      otp: '964223' // This was the OTP generated in the previous test
    };

    console.log('🔢 Verifying OTP:', verifyPayload.otp);
    console.log('📧 For email:', verifyPayload.email);

    const verifyResponse = await fetch(`${API_BASE}/api/otp/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyPayload)
    });

    const verifyData = await verifyResponse.json();
    console.log('Verify OTP Response:', {
      status: verifyResponse.status,
      success: verifyData.success,
      message: verifyData.message,
      hasToken: !!verifyData.data?.token,
      hasUser: !!verifyData.data?.user
    });

    if (verifyResponse.ok) {
      console.log('✅ OTP verification successful!');
      console.log('👤 User authenticated:', verifyData.data?.user?.email);
      console.log('🔑 Token received:', verifyData.data?.token ? 'Yes' : 'No');
    } else {
      console.log('❌ OTP verification failed:', verifyData.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOTPVerification();
