import mongoose from 'mongoose';
import Order from './models/Order.js';

async function getRealOrder() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://simrankadamkb12:Simran%40123@ac-jue9wbm-shard-00-00.2sc2fg5.mongodb.net/kkings');
    
    const order = await Order.findOne().limit(1);
    if (order) {
      console.log('Found order ID:', order._id);
      console.log('Order email:', order.guestInfo?.email || order.customer?.email);
      console.log('Order status:', order.status);
    } else {
      console.log('No orders found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

getRealOrder();
