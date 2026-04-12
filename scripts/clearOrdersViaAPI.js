// 🗑️ CLEAR ORDERS VIA API
// This script clears orders by making API calls to the running server

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function clearOrdersViaAPI() {
  try {
    console.log('🔌 Connecting to backend API...');
    
    // Test if server is running
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      throw new Error('Backend server is not running');
    }
    console.log('✅ Backend server is running');
    
    // Get current orders count
    const ordersResponse = await fetch(`${API_BASE}/orders`);
    if (!ordersResponse.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const ordersData = await ordersResponse.json();
    const currentCount = ordersData.orders?.length || 0;
    console.log(`📋 Current orders count: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('✅ Orders collection is already empty');
      return;
    }
    
    // Note: We'll need to create an admin endpoint to clear orders
    // For now, let's just show the current orders
    console.log('📋 Current orders:');
    ordersData.orders?.forEach((order, index) => {
      console.log(`  ${index + 1}. Order ID: ${order._id || order.id}`);
      console.log(`     Customer: ${order.customer?.name || 'Guest User'}`);
      console.log(`     Email: ${order.customer?.email || 'N/A'}`);
      console.log(`     Amount: ₹${order.totalAmount || 0}`);
    });
    
    console.log('⚠️  To clear orders, please use MongoDB Compass or run the clearOrders.js script when the server is not running');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
clearOrdersViaAPI().catch(console.error);
