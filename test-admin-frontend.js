import fetch from 'node-fetch';

async function testAdminFrontend() {
  try {
    // Login as admin first
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
    const token = loginData.data.token;

    console.log('=== TESTING FRONTEND ANALYTICS API CALL ===');
    
    // Test the exact same call the frontend makes
    const analyticsResponse = await fetch('http://localhost:5000/api/admin/analytics?range=30&period=daily&validate=false&strictPopulate=false', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', analyticsResponse.status);
    console.log('Response headers:', Object.fromEntries(analyticsResponse.headers.entries()));

    const analyticsData = await analyticsResponse.json();
    console.log('Response success:', analyticsData.success);
    console.log('Response data keys:', analyticsData.data ? Object.keys(analyticsData.data) : 'No data');
    
    if (analyticsData.data) {
      console.log('DateData keys:', Object.keys(analyticsData.data.dateData || {}));
      console.log('Sample dateData entry:', Object.entries(analyticsData.data.dateData || {})[0]);
      console.log('Summary:', analyticsData.data.summary);
    }

  } catch (error) {
    console.error('Error testing admin frontend API:', error);
  }
}

testAdminFrontend();
