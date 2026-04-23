import fetch from 'node-fetch';

async function testAnalyticsFixed() {
  try {
    // Step 1: Login
    console.log('=== Testing Analytics API After Route Fix ===');
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
    
    // Step 2: Get Analytics - should now hit the correct route
    console.log('Testing /api/admin/analytics (should hit shared controller)...');
    const analyticsResponse = await fetch('http://localhost:5000/api/admin/analytics?range=30&period=daily', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', analyticsResponse.status);
    
    const analyticsData = await analyticsResponse.json();
    console.log('Success:', analyticsData.success);
    console.log('Data keys:', analyticsData.data ? Object.keys(analyticsData.data) : 'No data');
    
    if (analyticsData.success && analyticsData.data) {
      console.log('Summary:', analyticsData.data.summary);
      console.log('DateData entries:', Object.keys(analyticsData.data.dateData || {}).length);
      
      // Show first 3 days of data
      const dateEntries = Object.entries(analyticsData.data.dateData || {}).slice(0, 3);
      dateEntries.forEach(([date, data]) => {
        console.log(`${date}: Orders=${data.orders}, Revenue=${data.revenue}, Customers=${data.customers}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnalyticsFixed();
