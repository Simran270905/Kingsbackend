import dotenv from 'dotenv'
dotenv.config()

/**
 * Run the quick fix for delivered COD orders
 */

const runQuickFix = async () => {
  console.log('🔧 RUNNING QUICK FIX FOR DELIVERED COD ORDERS')
  console.log('=' .repeat(60))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    // Step 1: Check current status
    console.log('\n1️⃣ Checking current order status...')
    try {
      const response = await fetch(`${apiBase}/fix/status`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Status check successful')
        console.log('📊 Current Order Status:')
        
        Object.entries(data.data.statusBreakdown).forEach(([status, info]) => {
          console.log(`   ${status}: ${info.count} orders (₹${info.totalAmount})`)
        })
        
        console.log('\n💳 Payment Status:')
        Object.entries(data.data.paymentBreakdown).forEach(([status, info]) => {
          console.log(`   ${status}: ${info.count} orders (₹${info.totalAmount})`)
        })
        
        console.log(`\n💰 Current Revenue: ₹${data.data.currentRevenue}`)
        console.log(`📦 Delivered orders: ${data.data.issue.deliveredOrders}`)
        console.log(`💳 Paid orders: ${data.data.issue.paidOrders}`)
        console.log(`⚠️  Needs fix: ${data.data.issue.needsFix ? 'YES' : 'NO'}`)
        console.log(`💸 Missing revenue: ₹${data.data.issue.missingRevenue}`)
        
        if (data.data.deliveredPendingOrders > 0) {
          console.log('\n📋 Delivered orders pending payment:')
          data.data.deliveredPendingDetails.forEach(order => {
            console.log(`   Order ${order.orderId}: ₹${order.amount} (${order.paymentMethod})`)
          })
        }
        
        if (data.data.issue.needsFix) {
          console.log('\n🔧 Proceeding with fix...')
        } else {
          console.log('\n✅ No fix needed - all delivered orders are properly paid')
          return
        }
      } else {
        console.log('❌ Status check failed:', data.message)
        return
      }
    } catch (error) {
      console.log('❌ Status check error:', error.message)
      return
    }
    
    // Step 2: Run the fix
    console.log('\n2️⃣ Running quick fix for delivered COD orders...')
    try {
      const response = await fetch(`${apiBase}/fix/delivered-cod`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('🎉 FIX SUCCESSFUL!')
        console.log(`✅ Orders fixed: ${data.data.ordersFixed}`)
        console.log(`💰 Revenue added: ₹${data.data.revenueAdded}`)
        
        if (data.data.fixedOrders.length > 0) {
          console.log('\n📋 Fixed Orders:')
          data.data.fixedOrders.forEach(order => {
            console.log(`   Order ${order.orderNumber}: ₹${order.amount} (${order.paymentMethod})`)
          })
        }
        
        console.log('\n📊 Verification:')
        console.log(`   Delivered & Paid Orders: ${data.data.verification.deliveredPaidOrders}`)
        console.log(`   Total Revenue from Delivered: ₹${data.data.verification.totalRevenueFromDelivered}`)
        
        console.log('\n📝 Instructions:')
        data.data.instructions.forEach(instruction => {
          console.log(`   • ${instruction}`)
        })
        
      } else {
        console.log('❌ Fix failed:', data.message)
      }
    } catch (error) {
      console.log('❌ Fix error:', error.message)
    }
    
    // Step 3: Verify the fix
    console.log('\n3️⃣ Verifying the fix...')
    try {
      const response = await fetch(`${apiBase}/fix/status`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Verification complete')
        console.log(`📊 Updated Revenue: ₹${data.data.currentRevenue}`)
        console.log(`📦 Delivered orders: ${data.data.issue.deliveredOrders}`)
        console.log(`💳 Paid orders: ${data.data.issue.paidOrders}`)
        console.log(`⚠️  Still needs fix: ${data.data.issue.needsFix ? 'YES' : 'NO'}`)
        
        if (!data.data.issue.needsFix) {
          console.log('\n🎉 PERFECT! All delivered orders are now properly counted in revenue!')
          console.log('🔄 Refresh your admin panel to see the updated revenue.')
        } else {
          console.log('\n⚠️  Some orders still need attention')
        }
      }
    } catch (error) {
      console.log('❌ Verification error:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Quick fix process failed:', error)
  }
}

// Run the quick fix
runQuickFix()
