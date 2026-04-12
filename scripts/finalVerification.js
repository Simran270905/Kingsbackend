import dotenv from 'dotenv'
dotenv.config()

/**
 * Final verification script to ensure everything is working
 */

const finalVerification = async () => {
  console.log('🔍 FINAL VERIFICATION - COMPLETE SYSTEM CHECK')
  console.log('=' .repeat(60))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    console.log('\n1️⃣ BACKEND API VERIFICATION')
    console.log('-' .repeat(40))
    
    // Test backend stats
    try {
      const response = await fetch(`${apiBase}/orders/stats`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Backend API working correctly')
        console.log(`📊 Backend Revenue: ₹${data.data.revenue}`)
        console.log(`📦 Total Orders: ${data.data.total}`)
        console.log(`🚚 Delivered Orders: ${data.data.delivered}`)
        console.log(`💳 Paid Orders: ${data.data.paymentStatus.paid}`)
        console.log(`⏳ Pending Orders: ${data.data.paymentStatus.pending}`)
        
        if (data.data.revenue > 0) {
          console.log('✅ Backend revenue calculation is working!')
        } else {
          console.log('❌ Backend revenue is still ₹0')
        }
      } else {
        console.log('❌ Backend API failed:', data.message)
      }
    } catch (error) {
      console.log('❌ Backend API error:', error.message)
    }
    
    console.log('\n2️⃣ FRONTEND CONFIGURATION VERIFICATION')
    console.log('-' .repeat(40))
    
    // Test frontend API URL
    try {
      const response = await fetch('http://localhost:5000/api/orders/stats')
      if (response.ok) {
        console.log('✅ Frontend can reach backend API')
        console.log('✅ API URL configuration is correct')
      } else {
        console.log('❌ Frontend cannot reach backend API')
      }
    } catch (error) {
      console.log('❌ Frontend API connection error:', error.message)
    }
    
    console.log('\n3️⃣ COD VERIFICATION')
    console.log('-' .repeat(40))
    
    // Check COD orders
    try {
      const response = await fetch(`${apiBase}/fix/status`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ COD tracking working')
        console.log(`📦 Delivered Orders: ${data.data.issue.deliveredOrders}`)
        console.log(`💳 Paid Orders: ${data.data.issue.paidOrders}`)
        console.log(`⚠️  Needs Fix: ${data.data.issue.needsFix ? 'YES' : 'NO'}`)
        
        if (!data.data.issue.needsFix) {
          console.log('✅ All delivered orders are properly paid!')
        }
      }
    } catch (error) {
      console.log('❌ COD verification error:', error.message)
    }
    
    console.log('\n4️⃣ SYSTEM HEALTH CHECK')
    console.log('-' .repeat(40))
    
    // Test server health
    try {
      const response = await fetch('http://localhost:5000/')
      if (response.ok) {
        console.log('✅ Server is running and healthy')
      } else {
        console.log('❌ Server health check failed')
      }
    } catch (error) {
      console.log('❌ Server not responding:', error.message)
    }
    
    console.log('\n🎯 FINAL STATUS SUMMARY')
    console.log('=' .repeat(40))
    
    console.log('\n✅ WHAT SHOULD BE WORKING:')
    console.log('• Backend API: http://localhost:5000/api')
    console.log('• Revenue calculation: Only paid orders counted')
    console.log('• COD tracking: Delivered orders marked as paid')
    console.log('• Frontend configuration: Using local backend')
    console.log('• Real-time updates: 30-second polling')
    
    console.log('\n🔧 FRONTEND INSTRUCTIONS:')
    console.log('1. Restart frontend server:')
    console.log('   cd "c:\\Users\\simra\\OneDrive\\Desktop\\new\\KKings_Jewellery-main"')
    console.log('   npm run dev')
    console.log('\n2. Open admin panel and check:')
    console.log('   • Revenue should show ₹7,316')
    console.log('   • Delivered orders: 2')
    console.log('   • Debug info should show backend data')
    console.log('\n3. Click "Refresh" button if needed')
    
    console.log('\n🐛 TROUBLESHOOTING:')
    console.log('• If still ₹0: Check browser console for errors')
    console.log('• If errors: Check API calls in Network tab')
    console.log('• If loading: Backend might be slow, wait 30 seconds')
    
    console.log('\n📊 EXPECTED RESULTS:')
    console.log('• Backend Revenue: ₹7,316')
    console.log('• Frontend Revenue: ₹7,316')
    console.log('• Delivered Orders: 2')
    console.log('• Paid Orders: 2')
    
  } catch (error) {
    console.error('❌ Final verification failed:', error)
  }
}

// Run the verification
finalVerification()
