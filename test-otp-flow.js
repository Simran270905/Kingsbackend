// Test complete OTP flow
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testOTPFlow() {
  console.log('🧪 Testing Complete OTP Flow...\n');

  try {
    // Test 1: Send OTP
    console.log('1️⃣ Testing Send OTP...');
    const sendOTPPayload = {
      name: 'Test User',
      email: 'simrankadamkb12@gmail.com',
      phone: '9876543210'
    };

    const sendResponse = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendOTPPayload)
    });

    const sendData = await sendResponse.json();
    console.log('Send OTP Response:', {
      status: sendResponse.status,
      success: sendData.success,
      message: sendData.message,
      emailSent: sendData.data?.emailSent,
      messageId: sendData.data?.messageId
    });

    if (sendResponse.ok && sendData.data?.emailSent) {
      console.log('✅ OTP sent successfully via email!\n');
      
      // Test 2: Test Email Endpoint
      console.log('2️⃣ Testing Test Email Endpoint...');
      const testEmailResponse = await fetch(`${API_BASE}/api/otp/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'simrankadamkb12@gmail.com',
          name: 'Test Email User'
        })
      });

      const testEmailData = await testEmailResponse.json();
      console.log('Test Email Response:', {
        status: testEmailResponse.status,
        success: testEmailData.success,
        message: testEmailData.message,
        testOTP: testEmailData.data?.testOTP
      });

      if (testEmailResponse.ok) {
        console.log('✅ Test email sent successfully!\n');
        console.log('📧 Check your inbox for both emails!');
        console.log('🔢 Test OTP from test email:', testEmailData.data?.testOTP);
      } else {
        console.log('❌ Test email failed:', testEmailData.message);
      }

    } else {
      console.log('❌ Send OTP failed:', sendData.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOTPFlow();
