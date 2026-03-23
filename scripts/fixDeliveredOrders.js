import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Order from '../models/Order.js'

dotenv.config()

const fixDeliveredOrders = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')
    
    // Find all delivered orders
    const deliveredOrders = await Order.find({ status: 'delivered' })
    console.log(`📦 Found ${deliveredOrders.length} delivered orders`)
    
    if (deliveredOrders.length === 0) {
      console.log('ℹ️  No delivered orders found')
      return
    }
    
    console.log('\n🔍 Analyzing delivered orders:')
    
    let codOrdersNeedingPayment = []
    let prepaidOrders = []
    let alreadyPaidOrders = []
    
    deliveredOrders.forEach(order => {
      console.log(`\n📋 Order ${order._id.toString().slice(-8).toUpperCase()}:`)
      console.log(`   Status: ${order.status}`)
      console.log(`   Payment Method: ${order.paymentMethod}`)
      console.log(`   Payment Status: ${order.paymentStatus}`)
      console.log(`   Amount: ₹${order.totalAmount}`)
      
      if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
        codOrdersNeedingPayment.push(order)
        console.log(`   ⚠️  COD order delivered but payment not marked as collected!`)
      } else if (order.paymentMethod === 'cod' && order.paymentStatus === 'paid') {
        alreadyPaidOrders.push(order)
        console.log(`   ✅ COD order already paid`)
      } else if (order.paymentMethod !== 'cod') {
        if (order.paymentStatus === 'paid') {
          prepaidOrders.push(order)
          console.log(`   ✅ Prepaid order already paid`)
        } else {
          console.log(`   ❌ Prepaid order with unexpected payment status: ${order.paymentStatus}`)
        }
      }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`   COD orders needing payment: ${codOrdersNeedingPayment.length}`)
    console.log(`   COD orders already paid: ${alreadyPaidOrders.length}`)
    console.log(`   Prepaid orders: ${prepaidOrders.length}`)
    
    // Calculate current vs potential revenue
    const currentRevenue = [...alreadyPaidOrders, ...prepaidOrders].reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const potentialRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    const missingRevenue = codOrdersNeedingPayment.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    
    console.log(`\n💰 Revenue Analysis:`)
    console.log(`   Current Revenue: ₹${currentRevenue}`)
    console.log(`   Potential Revenue: ₹${potentialRevenue}`)
    console.log(`   Missing Revenue (COD not collected): ₹${missingRevenue}`)
    
    if (codOrdersNeedingPayment.length > 0) {
      console.log(`\n🔧 AUTOMATIC FIX:`)
      console.log(`   Marking ${codOrdersNeedingPayment.length} COD orders as paid...`)
      
      for (const order of codOrdersNeedingPayment) {
        order.paymentStatus = 'paid'
        order.notes = order.notes ? `${order.notes} | Auto-marked as paid on ${new Date().toLocaleDateString()}` : `Auto-marked as paid on ${new Date().toLocaleDateString()}`
        await order.save()
        
        console.log(`   ✅ Order ${order._id.toString().slice(-8).toUpperCase()} marked as paid (+₹${order.totalAmount})`)
      }
      
      const newRevenue = currentRevenue + missingRevenue
      console.log(`\n🎉 REVENUE UPDATED:`)
      console.log(`   Previous Revenue: ₹${currentRevenue}`)
      console.log(`   Added Revenue: ₹${missingRevenue}`)
      console.log(`   New Revenue: ₹${newRevenue}`)
      
      console.log(`\n✅ The delivered COD orders have been automatically marked as paid!`)
      console.log(`   Your admin panel should now show the correct revenue.`)
      
    } else {
      console.log(`\n✅ All delivered orders are already properly paid!`)
    }
    
    // Final verification
    console.log(`\n🔍 Final Verification:`)
    const finalPaidOrders = await Order.find({ status: 'delivered', paymentStatus: 'paid' })
    const finalRevenue = finalPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    
    console.log(`   Delivered orders with paid status: ${finalPaidOrders.length}`)
    console.log(`   Total revenue from delivered orders: ₹${finalRevenue}`)
    
    if (finalPaidOrders.length === deliveredOrders.length) {
      console.log(`   ✅ All delivered orders are now correctly counted in revenue!`)
    } else {
      console.log(`   ⚠️  Some delivered orders still need attention`)
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the fix
fixDeliveredOrders()
