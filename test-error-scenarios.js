// Test error scenarios
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testErrorScenarios() {
  console.log('🧪 Testing Error Scenarios...\n');

  try {
    // Test 1: Invalid email format
    console.log('1️⃣ Testing Invalid Email Format...');
    const invalidEmailResponse = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email',
        phone: '9876543210'
      })
    });

    const invalidEmailData = await invalidEmailResponse.json();
    console.log('Invalid Email Response:', {
      status: invalidEmailResponse.status,
      success: invalidEmailData.success,
      message: invalidEmailData.message
    });

    // Test 2: Missing required fields
    console.log('\n2️⃣ Testing Missing Required Fields...');
    const missingFieldsResponse = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
        // Missing name
      })
    });

    const missingFieldsData = await missingFieldsResponse.json();
    console.log('Missing Fields Response:', {
      status: missingFieldsResponse.status,
      success: missingFieldsData.success,
      message: missingFieldsData.message
    });

    // Test 3: Invalid OTP verification
    console.log('\n3️⃣ Testing Invalid OTP Verification...');
    const invalidOTPResponse = await fetch(`${API_BASE}/api/otp/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'simrankadamkb12@gmail.com',
        otp: '999999' // Invalid OTP
      })
    });

    const invalidOTPData = await invalidOTPResponse.json();
    console.log('Invalid OTP Response:', {
      status: invalidOTPResponse.status,
      success: invalidOTPData.success,
      message: invalidOTPData.message
    });

    // Test 4: Test email endpoint with missing fields
    console.log('\n4️⃣ Testing Test Email with Missing Fields...');
    const testEmailMissingResponse = await fetch(`${API_BASE}/api/otp/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
        // Missing name
      })
    });

    const testEmailMissingData = await testEmailMissingResponse.json();
    console.log('Test Email Missing Fields Response:', {
      status: testEmailMissingResponse.status,
      success: testEmailMissingData.success,
      message: testEmailMissingData.message
    });

    console.log('\n✅ Error scenario testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testErrorScenarios();
