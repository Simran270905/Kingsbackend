import fetch from 'node-fetch';

async function checkAnalyticsResponse() {
  try {
    // Login as admin
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

    // Get analytics data
    const analyticsResponse = await fetch('http://localhost:5000/api/admin/analytics?range=30&period=daily', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const analyticsData = await analyticsResponse.json();
    
    console.log('=== BACKEND RESPONSE STRUCTURE ===');
    console.log('Response keys:', Object.keys(analyticsData.data));
    
    console.log('\n=== SUMMARY FIELDS ===');
    console.log('summary keys:', Object.keys(analyticsData.data.summary));
    
    console.log('\n=== WHAT FRONTEND EXPECTS vs WHAT BACKEND PROVIDES ===');
    console.log('Frontend expects totalSold, backend has:', 'totalProductsSold' in analyticsData.data.summary);
    console.log('Frontend expects uniqueCustomers, backend has:', 'totalCustomers' in analyticsData.data.summary);
    
    console.log('\n=== DAILY SALES DATA ===');
    console.log('dateData type:', typeof analyticsData.data.dateData);
    console.log('dateData keys count:', Object.keys(analyticsData.data.dateData).length);
    
    console.log('\n=== STATUS BREAKDOWN ===');
    console.log('statusBreakdown:', analyticsData.data.statusBreakdown);
    
    console.log('\n=== TOP PRODUCTS ===');
    console.log('topSellingProducts length:', analyticsData.data.topSellingProducts?.length || 0);
    if (analyticsData.data.topSellingProducts?.length > 0) {
      console.log('Sample product fields:', Object.keys(analyticsData.data.topSellingProducts[0]));
    }
    
    console.log('\n=== STOCK ANALYTICS ===');
    console.log('stock keys:', Object.keys(analyticsData.data.stock || {}));

  } catch (error) {
    console.error('Error checking analytics response:', error);
  }
}

checkAnalyticsResponse();
