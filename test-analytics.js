import fetch from 'node-fetch';

async function testAnalytics() {
  try {
    // First login as admin
    const loginResponse = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@kkings.com',
        password: 'Kkingsjewellery@11'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.success) {
      console.error('Admin login failed');
      return;
    }

    const token = loginData.data.token;
    console.log('Admin token obtained:', token.substring(0, 50) + '...');

    // Now test analytics API
    const analyticsResponse = await fetch('http://localhost:5000/api/admin/analytics?range=30&period=daily', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const analyticsData = await analyticsResponse.json();
    console.log('Analytics response:', JSON.stringify(analyticsData, null, 2));

  } catch (error) {
    console.error('Error testing analytics:', error);
  }
}

testAnalytics();
