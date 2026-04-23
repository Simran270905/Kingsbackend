import fetch from 'node-fetch';

async function analyzeAnalytics() {
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
    const token = loginData.data.token;

    // Get analytics data
    const analyticsResponse = await fetch('http://localhost:5000/api/admin/analytics?range=30&period=daily', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const analyticsData = await analyticsResponse.json();
    
    console.log('=== ANALYTICS SUMMARY ===');
    console.log('Total Revenue:', analyticsData.data.summary.totalRevenue);
    console.log('Total Orders:', analyticsData.data.summary.totalOrders);
    console.log('Total Customers:', analyticsData.data.summary.totalCustomers);
    console.log('Total Paid Orders:', analyticsData.data.summary.totalPaidOrders);
    console.log('Average Order Value:', analyticsData.data.summary.avgOrderValue);
    
    console.log('\n=== STATUS BREAKDOWN ===');
    console.log('Pending:', analyticsData.data.statusBreakdown.pending);
    console.log('Confirmed:', analyticsData.data.statusBreakdown.confirmed);
    console.log('Processing:', analyticsData.data.statusBreakdown.processing);
    console.log('Shipped:', analyticsData.data.statusBreakdown.shipped);
    console.log('Delivered:', analyticsData.data.statusBreakdown.delivered);
    console.log('Cancelled:', analyticsData.data.statusBreakdown.cancelled);
    
    console.log('\n=== PAYMENT STATUS BREAKDOWN ===');
    console.log('Pending:', analyticsData.data.paymentStatusBreakdown.pending);
    console.log('Paid:', analyticsData.data.paymentStatusBreakdown.paid);
    console.log('Failed:', analyticsData.data.paymentStatusBreakdown.failed);
    console.log('Refunded:', analyticsData.data.paymentStatusBreakdown.refunded);
    
    console.log('\n=== DATE DATA SAMPLE ===');
    const dateEntries = Object.entries(analyticsData.data.dateData);
    console.log('Total days with data:', dateEntries.length);
    if (dateEntries.length > 0) {
      const sampleDate = dateEntries[0];
      console.log(`Sample date ${sampleDate[0]}:`, sampleDate[1]);
    }
    
    console.log('\n=== RECENT ORDERS ===');
    console.log('Recent orders count:', analyticsData.data.recentOrders.length);
    if (analyticsData.data.recentOrders.length > 0) {
      const sampleOrder = analyticsData.data.recentOrders[0];
      console.log('Sample order:', {
        id: sampleOrder._id,
        totalAmount: sampleOrder.totalAmount,
        status: sampleOrder.status,
        paymentStatus: sampleOrder.paymentStatus,
        createdAt: sampleOrder.createdAt
      });
    }

  } catch (error) {
    console.error('Error analyzing analytics:', error);
  }
}

analyzeAnalytics();
