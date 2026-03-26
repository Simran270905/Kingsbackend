// Pre-deployment comprehensive test
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function runPreDeploymentTests() {
  console.log('🧪 Running Pre-Deployment Tests...\n');

  let testsPassed = 0;
  let testsTotal = 0;

  function test(name, testFn) {
    testsTotal++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        testsPassed++;
      } else {
        console.log(`❌ ${name}`);
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error.message}`);
    }
  }

  // Test 1: Backend Health Check
  test('Backend Health Check', async () => {
    const response = await fetch(`${API_BASE}/`);
    const data = await response.json();
    return response.ok && data.status === 'active';
  });

  // Test 2: Email Service Configuration
  test('Email Service Configuration', async () => {
    const response = await fetch(`${API_BASE}/api/otp/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'simrankadamkb12@gmail.com',
        name: 'Pre-Deployment Test'
      })
    });
    const data = await response.json();
    return response.ok && data.success;
  });

  // Test 3: OTP Send Endpoint
  test('OTP Send Endpoint', async () => {
    const response = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210'
      })
    });
    const data = await response.json();
    return response.ok && data.data?.emailSent;
  });

  // Test 4: Error Handling - Invalid Email
  test('Error Handling - Invalid Email', async () => {
    const response = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email',
        phone: '9876543210'
      })
    });
    return response.status === 400;
  });

  // Test 5: Error Handling - Missing Fields
  test('Error Handling - Missing Fields', async () => {
    const response = await fetch(`${API_BASE}/api/otp/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
        // Missing name
      })
    });
    return response.status === 400;
  });

  // Test 6: CORS Headers
  test('CORS Headers Present', async () => {
    const response = await fetch(`${API_BASE}/`, {
      headers: { 'Origin': 'https://kings-main.vercel.app' }
    });
    return response.headers.get('access-control-allow-origin') !== null;
  });

  // Test 7: Environment Variables Check
  test('Environment Variables Check', () => {
    return process.env.EMAIL_USER && 
           process.env.EMAIL_PASS && 
           process.env.MONGO_URI && 
           process.env.JWT_SECRET;
  });

  // Test 8: Frontend Build Exists
  test('Frontend Build Exists', () => {
    const fs = require('fs');
    const path = require('path');
    const distPath = path.join('../KKings_Jewellery-main', 'dist');
    return fs.existsSync(distPath);
  });

  console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);

  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Ready for deployment!\n');
    console.log('📋 Next Steps:');
    console.log('1. Push backend to GitHub → Deploy to Render');
    console.log('2. Push frontend to GitHub → Deploy to Vercel');
    console.log('3. Update environment variables in production');
    console.log('4. Test deployed applications');
    console.log('5. Monitor and verify email OTP flow');
  } else {
    console.log('⚠️ Some tests failed. Please fix issues before deployment.\n');
    console.log('🔧 Check:');
    console.log('1. Backend server is running on port 5000');
    console.log('2. All environment variables are set');
    console.log('3. Email service is configured correctly');
    console.log('4. Frontend build is successful');
  }

  return testsPassed === testsTotal;
}

// Run the tests
runPreDeploymentTests().catch(console.error);
