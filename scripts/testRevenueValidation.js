import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'

dotenv.config()

const testRevenueValidation = async () => {
  try {
    console.log('🔍 Testing Revenue Validation System...\n')
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')
    
    // Get all orders and payments
    console.log('\n📊 Fetching data...')
    const allOrders = await Order.find({}).sort({ createdAt: -1 }).limit(100)
    const allPayments = await Payment.find({}).populate('orderId').sort({ createdAt: -1 }).limit(100)
    
    console.log(`Found ${allOrders.length} orders and ${allPayments.length} payments`)
    
    // Calculate revenue from orders (paid only)
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid')
    const orderRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    
    // Calculate revenue from payments (captured only)
    const capturedPayments = allPayments.filter(p => p.status === 'captured')
    const paymentRevenue = capturedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    
    console.log('\n💰 Revenue Analysis:')
    console.log(`   Orders (paid): ${paidOrders.length} orders`)
    console.log(`   Payments (captured): ${capturedPayments.length} payments`)
    console.log(`   Order Revenue: ₹${orderRevenue.toFixed(2)}`)
    console.log(`   Payment Revenue: ₹${paymentRevenue.toFixed(2)}`)
    console.log(`   Difference: ₹${Math.abs(orderRevenue - paymentRevenue).toFixed(2)}`)
    
    // Check for mismatches
    const revenueMatch = Math.abs(orderRevenue - paymentRevenue) < 1
    console.log(`   Match: ${revenueMatch ? '✅' : '❌'}`)
    
    if (!revenueMatch) {
      console.log('\n⚠️  REVENUE MISMATCH DETECTED!')
      
      // Find specific mismatches
      const paymentMap = new Map()
      capturedPayments.forEach(p => {
        if (p.orderId) {
          paymentMap.set(p.orderId.toString(), p)
        }
      })
      
      const mismatches = []
      paidOrders.forEach(order => {
        const payment = paymentMap.get(order._id.toString())
        if (!payment) {
          mismatches.push({
            orderId: order._id,
            orderAmount: order.totalAmount,
            paymentAmount: 0,
            type: 'missing_payment'
          })
        } else if (Math.abs(order.totalAmount - payment.amount) > 1) {
          mismatches.push({
            orderId: order._id,
            orderAmount: order.totalAmount,
            paymentAmount: payment.amount,
            type: 'amount_mismatch'
          })
        }
      })
      
      console.log(`\n🔍 Found ${mismatches.length} mismatches:`)
      mismatches.slice(0, 5).forEach(m => {
        console.log(`   Order ${m.orderId.toString().slice(-8)}: ₹${m.orderAmount} vs ₹${m.paymentAmount} (${m.type})`)
      })
      
      if (mismatches.length > 5) {
        console.log(`   ... and ${mismatches.length - 5} more`)
      }
    }
    
    // Test edge cases
    console.log('\n🧪 Testing Edge Cases:')
    
    // 1. Orders with paymentStatus='paid' but no payment record
    const paidOrdersWithoutPayment = paidOrders.filter(order => {
      return !capturedPayments.some(p => p.orderId && p.orderId.toString() === order._id.toString())
    })
    console.log(`   Orders marked 'paid' without payment record: ${paidOrdersWithoutPayment.length}`)
    
    // 2. Payments without orders
    const orphanedPayments = capturedPayments.filter(p => !p.orderId)
    console.log(`   Captured payments without orders: ${orphanedPayments.length}`)
    
    // 3. Refunded orders still counted in revenue
    const refundedPaidOrders = paidOrders.filter(o => o.status === 'refunded')
    console.log(`   Refunded orders with 'paid' status: ${refundedPaidOrders.length}`)
    if (refundedPaidOrders.length > 0) {
      const refundedRevenue = refundedPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      console.log(`   Revenue from refunded orders: ₹${refundedRevenue.toFixed(2)}`)
    }
    
    // 4. Failed payments with paid orders
    const failedPaymentsWithPaidOrders = capturedPayments.filter(p => {
      return p.orderId && paidOrders.some(o => o._id.toString() === p.orderId.toString() && o.paymentStatus === 'paid')
    })
    console.log(`   Failed payments linked to paid orders: ${failedPaymentsWithPaidOrders.length}`)
    
    console.log('\n✅ Revenue Validation Test Complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

// Run the test
testRevenueValidation()
