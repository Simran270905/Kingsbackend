import mongoose from 'mongoose';
import Order from './models/Order.js';

async function testDatabaseOrder() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://simrankadamkb12:Simran%40123@ac-jue9wbm-shard-00-00.2sc2fg5.mongodb.net/kkingsjewellery?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');
    
    // Find the order
    const orderId = '69e0ba244f61dfa376a24a83';
    const order = await Order.findById(orderId);
    
    if (order) {
      console.log('Order found:');
      console.log('- Order ID:', order._id);
      console.log('- Payment Status:', order.paymentStatus);
      console.log('- Shipping Status:', order.shippingStatus);
      console.log('- Shipment ID:', order.shipmentId);
      console.log('- Shiprocket Order ID:', order.shiprocketOrderId);
      console.log('- Tracking URL:', order.trackingUrl);
      console.log('- AWB Code:', order.awbCode);
      console.log('- Courier Name:', order.courierName);
      console.log('- Full order object:', JSON.stringify(order.toObject(), null, 2));
    } else {
      console.log('Order not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabaseOrder();
