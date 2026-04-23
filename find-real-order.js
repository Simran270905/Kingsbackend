// Find real order for simrankadamkb12@gmail.com
import mongoose from 'mongoose';

async function findRealOrder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://Simrankadam_db_user:Simran123@cluster0.2sc2fg5.mongodb.net/?appName=Cluster0');
    console.log('Connected to MongoDB');
    
    // Import Order model
    const Order = mongoose.model('Order');
    
    // Find orders for the specified email
    const email = 'simrankadamkb12@gmail.com';
    console.log(`Searching for orders with email: ${email}`);
    
    const orders = await Order.find({
      $or: [
        { 'guestInfo.email': email },
        { 'customer.email': email },
        { 'customerEmail': email }
      ]
    }).lean();
    
    console.log(`Found ${orders.length} orders`);
    
    if (orders.length > 0) {
      // Display order details
      orders.forEach((order, index) => {
        console.log(`\n--- Order ${index + 1} ---`);
        console.log(`Order ID: ${order._id}`);
        console.log(`Status: ${order.status}`);
        console.log(`Email: ${order.guestInfo?.email || order.customer?.email || 'N/A'}`);
        console.log(`Items: ${order.items?.length || 0}`);
        console.log(`Total: ₹${order.totalAmount || order.finalAmount || 'N/A'}`);
        console.log(`Created: ${order.createdAt || order.created_at}`);
        
        if (order.items && order.items.length > 0) {
          console.log('Products:');
          order.items.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.name || 'Unknown Product'} (ID: ${item.productId})`);
          });
        }
      });
      
      // Return the first order for testing
      return orders[0];
    } else {
      console.log('No orders found for this email');
      return null;
    }
  } catch (error) {
    console.error('Error finding order:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
findRealOrder().then(order => {
  if (order) {
    console.log('\n=== ORDER FOR TESTING ===');
    console.log('Order ID:', order._id);
    console.log('Email:', order.guestInfo?.email || order.customer?.email);
    console.log('Products:', order.items?.length);
    process.exit(0);
  } else {
    console.log('No suitable order found for testing');
    process.exit(1);
  }
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
