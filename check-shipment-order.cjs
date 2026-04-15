// Load environment variables
require('dotenv').config();
const axios = require('axios');

async function checkShipmentOrder() {
  try {
    // Get admin token first
    const loginRes = await axios.post('http://localhost:5000/api/admin/login', {
      password: 'Kkingsjewellery@11'
    });
    
    const token = loginRes.data.data.token;
    console.log('Admin login successful');
    
    // Get order details
    const orderRes = await axios.get('http://localhost:5000/api/admin/orders/enhanced/69dfcff9d2f7f8e8444697b3', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const order = orderRes.data.data.data.order;
    console.log('=== ORDER DETAILS ===');
    console.log('Order ID:', order._id);
    console.log('Order Number:', order.orderNumber);
    console.log('Status:', order.status);
    console.log('Payment Status:', order.paymentStatus);
    console.log('Shipping Status:', order.shippingStatus);
    console.log('Shipment ID:', order.shiprocketOrderId);
    console.log('Tracking URL:', order.trackingUrl);
    console.log('Courier Name:', order.courierName);
    console.log('AWB Code:', order.awbCode);
    console.log('Customer Email:', order.guestInfo?.email);
    
  } catch (error) {
    console.log('ERROR:', error.response?.data || error.message);
  }
}

checkShipmentOrder();
