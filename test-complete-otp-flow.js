// Complete OTP flow test
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testCompleteOTPFlow() {
  console.log('🧪 Testing Complete OTP Flow...\n');

  try {
    // Step 1: Send OTP
    console.log('📤 Step 1: Sending OTP...');
    const sendResponse = await fetch(`${API_URL}/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '9876543210'
      })
    });

    const sendResult = await sendResponse.json();
    console.log('Send Status:', sendResponse.status);
    console.log('Send Response:', JSON.stringify(sendResult, null, 2));

    if (!sendResponse.ok || !sendResult.data?.otp) {
      console.log('❌ Failed to send OTP');
      return;
    }

    const otp = sendResult.data.otp;
    const email = 'john.doe@example.com';

    console.log(`\n✅ OTP generated: ${otp}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📱 Phone: 9876543210`);

    // Step 2: Verify OTP
    console.log('\n🔐 Step 2: Verifying OTP...');
    const verifyResponse = await fetch(`${API_URL}/otp/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        otp: otp
      })
    });

    const verifyResult = await verifyResponse.json();
    console.log('Verify Status:', verifyResponse.status);
    console.log('Verify Response:', JSON.stringify(verifyResult, null, 2));

    if (verifyResponse.ok) {
      console.log('\n✅ OTP Verification Successful!');
      console.log('👤 User authenticated:', verifyResult.data.user.email);
      console.log('🔑 Token received:', verifyResult.data.token ? 'Yes' : 'No');
      console.log('📱 Phone saved:', verifyResult.data.user.phone);

      // Step 3: Test with wrong OTP
      console.log('\n❌ Step 3: Testing wrong OTP...');
      const wrongOTPResponse = await fetch(`${API_URL}/otp/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          otp: '999999'
        })
      });

      const wrongOTPResult = await wrongOTPResponse.json();
      console.log('Wrong OTP Status:', wrongOTPResponse.status);
      console.log('Wrong OTP Response:', JSON.stringify(wrongOTPResult, null, 2));

    } else {
      console.log('❌ OTP Verification Failed');
    }

    console.log('\n🎯 Summary:');
    console.log('- OTP Generation:', sendResponse.ok ? '✅ Working' : '❌ Failed');
    console.log('- Email Service:', sendResult.data?.emailSent ? '✅ Working' : '⚠️ Fallback Mode');
    console.log('- OTP Verification:', verifyResponse.ok ? '✅ Working' : '❌ Failed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCompleteOTPFlow();
