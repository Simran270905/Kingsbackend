import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Order from '../models/Order.js'

dotenv.config()

const quickFixDeliveredCOD = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')
    
    // Find delivered orders with pending payment status
    const deliveredPendingOrders = await Order.find({
      status: 'delivered',
      paymentStatus: 'pending'
    })
    
    console.log(`🔍 Found ${deliveredPendingOrders.length} delivered orders with pending payment`)
    
    if (deliveredPendingOrders.length === 0) {
      console.log('✅ No delivered orders need fixing')
      return
    }
    
    let totalRevenueAdded = 0
    
    for (const order of deliveredPendingOrders) {
      console.log(`\n📦 Fixing Order ${order._id.toString().slice(-8).toUpperCase()}:`)
      console.log(`   Payment Method: ${order.paymentMethod}`)
      console.log(`   Current Status: ${order.status}`)
      console.log(`   Payment Status: ${order.paymentStatus}`)
      console.log(`   Amount: ₹${order.totalAmount}`)
      
      // Mark as paid
      order.paymentStatus = 'paid'
      const fixNote = `Auto-fixed on ${new Date().toLocaleDateString()} - Delivered order was marked as paid`
      order.notes = order.notes ? `${order.notes} | ${fixNote}` : fixNote
      
      await order.save()
      
      totalRevenueAdded += order.totalAmount
      
      console.log(`   ✅ FIXED: Marked as paid (+₹${order.totalAmount})`)
    }
    
    console.log(`\n🎉 FIX COMPLETE!`)
    console.log(`   Orders Fixed: ${deliveredPendingOrders.length}`)
    console.log(`   Revenue Added: ₹${totalRevenueAdded}`)
    
    // Verify the fix
    const finalStats = await Order.find({
      status: 'delivered',
      paymentStatus: 'paid'
    })
    
    const finalRevenue = finalStats.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    
    console.log(`\n📊 Final Verification:`)
    console.log(`   Delivered & Paid Orders: ${finalStats.length}`)
    console.log(`   Total Revenue from Delivered: ₹${finalRevenue}`)
    
    console.log(`\n✅ Your admin panel should now show:`)
    console.log(`   - Revenue: ₹${finalRevenue} (instead of ₹0)`)
    console.log(`   - All delivered orders properly counted`)
    
    console.log(`\n🔄 Refresh your admin panel to see the updated revenue!`)
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the fix
quickFixDeliveredCOD()
