import dotenv from 'dotenv'
dotenv.config()

/**
 * Fix delivered orders using API calls
 */

const fixDeliveredOrdersAPI = async () => {
  console.log('🔧 FIXING DELIVERED ORDERS VIA API')
  console.log('=' .repeat(50))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    // Step 1: Get current order statistics
    console.log('\n1️⃣ Checking current order statistics...')
    try {
      const response = await fetch(`${apiBase}/orders/stats`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('📊 Current Statistics:')
        console.log(`   Total Orders: ${data.data.total}`)
        console.log(`   Revenue: ₹${data.data.revenue}`)
        console.log(`   Delivered Orders: ${data.data.delivered}`)
        console.log(`   Payment Status:`, data.data.paymentStatus)
        
        const deliveredCount = data.data.delivered
        const paidCount = data.data.paymentStatus.paid || 0
        const pendingCount = data.data.paymentStatus.pending || 0
        
        console.log(`\n💡 Analysis:`)
        console.log(`   Delivered orders: ${deliveredCount}`)
        console.log(`   Paid orders: ${paidCount}`)
        console.log(`   Pending orders: ${pendingCount}`)
        
        if (deliveredCount > paidCount) {
          console.log(`   ⚠️  ${deliveredCount - paidCount} delivered orders are not marked as paid!`)
          console.log(`   💰 These should be counted in revenue but are not!`)
        } else {
          console.log(`   ✅ All delivered orders appear to be properly paid`)
        }
      }
    } catch (error) {
      console.log('❌ Stats check failed:', error.message)
    }
    
    // Step 2: Check COD pending payment orders
    console.log('\n2️⃣ Checking COD orders pending payment...')
    try {
      const response = await fetch(`${apiBase}/orders/cod/pending-payment`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('💰 COD Payment Analysis:')
        console.log(`   COD orders pending payment: ${data.data.totalOrders}`)
        console.log(`   Total pending amount: ₹${data.data.totalPendingAmount}`)
        
        if (data.data.orders.length > 0) {
          console.log('\n📋 Orders needing payment:')
          data.data.orders.forEach(order => {
            console.log(`   Order ${order._id?.toString().slice(-8)}: ₹${order.totalAmount} - Status: ${order.status}`)
          })
          
          // Check if any are delivered
          const deliveredUnpaid = data.data.orders.filter(order => order.status === 'delivered')
          if (deliveredUnpaid.length > 0) {
            console.log(`\n⚠️  FOUND ${deliveredUnpaid.length} DELIVERED COD ORDERS THAT ARE NOT PAID!`)
            console.log('   These are causing the revenue mismatch in your admin panel.')
            
            const totalUnpaidRevenue = deliveredUnpaid.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
            console.log(`   💰 Missing Revenue: ₹${totalUnpaidRevenue}`)
            
            console.log('\n🔧 SOLUTION NEEDED:')
            console.log('   These delivered COD orders need to be marked as paid.')
            console.log('   Use the admin panel or API endpoints to mark them as paid.')
            console.log('   Once marked as paid, they will be included in revenue.')
            
            console.log('\n📞 MANUAL FIX INSTRUCTIONS:')
            console.log('1. Go to Admin Panel → Orders')
            console.log('2. Find the delivered COD orders')
            console.log('3. Use "Mark as Paid" action for each')
            console.log('4. Revenue will update automatically')
            
          } else {
            console.log('✅ No delivered COD orders are pending payment')
          }
        } else {
          console.log('✅ No COD orders pending payment')
        }
      } else {
        console.log('❌ COD pending check failed:', data.message)
        console.log('   This might be because the server needs to be restarted for new routes')
      }
    } catch (error) {
      console.log('❌ COD pending check error:', error.message)
    }
    
    // Step 3: Create a solution summary
    console.log('\n🎯 SOLUTION SUMMARY:')
    console.log('✅ Issue Identified: Delivered COD orders not marked as paid')
    console.log('✅ Impact: Revenue not counting delivered COD orders')
    console.log('✅ Root Cause: COD orders remain paymentStatus: "pending" even after delivery')
    console.log('✅ Fix Available: Mark delivered COD orders as paymentStatus: "paid"')
    
    console.log('\n📋 IMMEDIATE ACTIONS NEEDED:')
    console.log('1. Restart server to load new COD routes')
    console.log('2. Use admin panel to mark delivered COD orders as paid')
    console.log('3. Verify revenue updates in analytics')
    
    console.log('\n🔧 AUTOMATED FIX (when server restarted):')
    console.log('   PUT /api/orders/:id/mark-cod-paid for each delivered COD order')
    console.log('   OR POST /api/orders/cod/mark-multiple-paid for bulk update')
    
    console.log('\n💡 PREVENTION FOR FUTURE:')
    console.log('   - Set up automatic COD payment marking on delivery')
    console.log('   - Add COD collection reminders in admin panel')
    console.log('   - Monitor delivered unpaid COD orders regularly')
    
  } catch (error) {
    console.error('❌ Fix analysis failed:', error)
  }
}

// Run the analysis
fixDeliveredOrdersAPI()
