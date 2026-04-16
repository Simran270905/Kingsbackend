// Test script to verify admin orders API returns all orders including guest orders
import mongoose from 'mongoose';
import Order from './models/Order.js';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kkings:jewellery@ac-jue9wbm-shard-00-02.2sc2fg5.mongodb.net/kkings?retryWrites=true&w=majority';

async function testOrdersAPI() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Test 1: Count total orders
    const totalOrders = await Order.countDocuments();
    console.log(`\n Total orders in database: ${totalOrders}`);

    // Test 2: Count orders with userId: null (guest orders)
    const guestOrders = await Order.countDocuments({ userId: null });
    console.log(` Guest orders (userId: null): ${guestOrders}`);

    // Test 3: Count orders with userId populated (user orders)
    const userOrders = await Order.countDocuments({ userId: { $exists: true, $ne: null } });
    console.log(` User orders (userId exists): ${userOrders}`);

    // Test 4: Count orders with customer object populated
    const customerOrders = await Order.countDocuments({ customer: { $exists: true, $ne: null } });
    console.log(` Orders with customer object: ${customerOrders}`);

    // Test 5: Fetch sample orders to check structure
    const sampleOrders = await Order.find()
      .populate('customer', 'name email phone')
      .limit(3)
      .lean();
    
    console.log('\n Sample order structure:');
    sampleOrders.forEach((order, index) => {
      console.log(`\n Order ${index + 1}:`);
      console.log(`  ID: ${order._id}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Payment Status: ${order.paymentStatus}`);
      console.log(`  Payment Method: ${order.paymentMethod}`);
      console.log(`  Total Amount: ${order.totalAmount}`);
      console.log(`  userId: ${order.userId || 'null'}`);
      console.log(`  Customer: ${order.customer ? JSON.stringify(order.customer) : 'null'}`);
      console.log(`  Items count: ${order.items?.length || 0}`);
      console.log(`  Shiprocket ID: ${order.shiprocketId || order.shiprocketOrderId || 'N/A'}`);
      console.log(`  Razorpay Order ID: ${order.razorpayOrderId || 'N/A'}`);
    });

    // Test 6: Simulate the admin API query (no userId filter)
    const adminQuery = {}; // Empty query to get ALL orders
    const adminOrders = await Order.find(adminQuery)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log(`\n Admin API simulation - Found ${adminOrders.length} orders (should be ${Math.min(10, totalOrders)})`);
    
    // Test 7: Check if customer info is properly extracted
    console.log('\n Customer info extraction test:');
    adminOrders.slice(0, 3).forEach((order, index) => {
      console.log(`\n Order ${index + 1} customer info:`);
      if (order.customer) {
        console.log(`  Name: ${order.customer.name}`);
        console.log(`  Email: ${order.customer.email}`);
        console.log(`  Phone: ${order.customer.phone}`);
      } else {
        console.log(`  Customer object: null`);
        console.log(`  Guest checkout: ${order.userId ? 'No' : 'Yes'}`);
      }
    });

    console.log('\n Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testOrdersAPI();
