import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://Simrankadam_db_user:Simran123@cluster0.2sc2fg5.mongodb.net/?appName=Cluster0')
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Check collection names
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  // Check orders count and sample data
  const Order = mongoose.model('Order', new mongoose.Schema({}, {strict: false, collection: 'orders'}));
  const count = await Order.countDocuments();
  console.log('Total orders count:', count);
  
  if (count > 0) {
    // Get sample orders to check field names
    const sample = await Order.find({}).limit(2).lean();
    console.log('Sample order 1:', JSON.stringify(sample[0], null, 2));
    
    // Check different field variations
    console.log('Field analysis:');
    console.log('- Has totalAmount:', sample.some(o => o.totalAmount !== undefined));
    console.log('- Has amount:', sample.some(o => o.amount !== undefined));
    console.log('- Has grandTotal:', sample.some(o => o.grandTotal !== undefined));
    console.log('- Has createdAt:', sample.some(o => o.createdAt !== undefined));
    console.log('- Has status:', sample.some(o => o.status !== undefined));
    console.log('- Has paymentStatus:', sample.some(o => o.paymentStatus !== undefined));
    
    // Check status values
    const statuses = await Order.distinct('status');
    const paymentStatuses = await Order.distinct('paymentStatus');
    console.log('Status values:', statuses);
    console.log('Payment status values:', paymentStatuses);
    
    // Check date range
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    console.log('Orders in last 30 days:', recentOrders);
    
    // Test the analytics query
    const paidOrders = await Order.find({ 
      createdAt: { $gte: thirtyDaysAgo },
      paymentStatus: 'paid'
    }).lean();
    console.log('Paid orders in last 30 days:', paidOrders.length);
    
    if (paidOrders.length > 0) {
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      console.log('Total revenue from paid orders:', totalRevenue);
    }
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
