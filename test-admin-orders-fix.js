// Test script to verify admin orders API fix
import mongoose from 'mongoose';
import Order from './models/Order.js';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kkings:jewellery@ac-jue9wbm-shard-00-02.2sc2fg5.mongodb.net/kkings?retryWrites=true&w=majority';

async function testOrdersFix() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Test 1: Count total orders
    const totalOrders = await Order.countDocuments();
    console.log(`\n Total orders in database: ${totalOrders}`);

    // Test 2: Fetch sample orders to check structure
    const sampleOrders = await Order.find().limit(3).lean();
    console.log('\n Sample order structure:');
    sampleOrders.forEach((order, index) => {
      console.log(`\n Order ${index + 1}:`);
      console.log(`  ID: ${order._id}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Payment Status: ${order.paymentStatus}`);
      console.log(`  Payment Method: ${order.paymentMethod}`);
      console.log(`  Total Amount: ${order.totalAmount}`);
      console.log(`  Has userId: ${!!order.userId}`);
      console.log(`  Has customer: ${!!order.customer}`);
      console.log(`  Has guestInfo: ${!!order.guestInfo}`);
      console.log(`  Has shippingAddress: ${!!order.shippingAddress}`);
      console.log(`  Items count: ${order.items?.length || 0}`);
      console.log(`  Shiprocket ID: ${order.shiprocketId || order.shiprocketOrderId || 'N/A'}`);
      console.log(`  Razorpay Order ID: ${order.razorpayOrderId || 'N/A'}`);
      console.log(`  Razorpay Payment ID: ${order.razorpayPaymentId || 'N/A'}`);
    });

    // Test 3: Check orders with different payment methods
    const codOrders = await Order.countDocuments({ paymentMethod: 'cod' });
    const razorpayOrders = await Order.countDocuments({ paymentMethod: 'razorpay' });
    console.log(`\n Payment method breakdown:`);
    console.log(`  COD orders: ${codOrders}`);
    console.log(`  Razorpay orders: ${razorpayOrders}`);

    // Test 4: Check orders with different statuses
    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log(`\n Status breakdown:`);
    statusBreakdown.forEach(item => {
      console.log(`  ${item._id}: ${item.count} orders`);
    });

    console.log('\n Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testOrdersFix();
