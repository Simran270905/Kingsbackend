import dotenv from 'dotenv'
dotenv.config()

/**
 * Check which API endpoints the admin panel might be using
 */

const checkAdminAPI = async () => {
  console.log('🔍 CHECKING ADMIN API ENDPOINTS')
  console.log('=' .repeat(50))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    // Check the main orders/stats endpoint (likely used by admin panel)
    console.log('\n1️⃣ Checking /api/orders/stats (main admin endpoint)...')
    try {
      const response = await fetch(`${apiBase}/orders/stats`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ /api/orders/stats working')
        console.log('📊 Order Stats Response:')
        console.log(`   Total Orders: ${data.data.total}`)
        console.log(`   Revenue: ₹${data.data.revenue}`)
        console.log(`   Payment Status:`, data.data.paymentStatus)
        console.log(`   Order Status:`, {
          pending: data.data.pending,
          processing: data.data.processing,
          shipped: data.data.shipped,
          delivered: data.data.delivered,
          cancelled: data.data.cancelled
        })
        
        console.log('\n💡 This is likely what your admin panel is showing!')
        if (data.data.revenue === 0) {
          console.log('❌ This endpoint still shows ₹0 revenue - this is the problem!')
        } else {
          console.log('✅ This endpoint shows correct revenue')
        }
      } else {
        console.log('❌ /api/orders/stats failed:', data.message)
      }
    } catch (error) {
      console.log('❌ /api/orders/stats error:', error.message)
    }
    
    // Check the analytics endpoint (if admin panel uses this)
    console.log('\n2️⃣ Checking /api/analytics (might require auth)...')
    try {
      const response = await fetch(`${apiBase}/analytics`)
      console.log(`   Status: ${response.status}`)
      if (response.status === 401) {
        console.log('   ✅ Analytics endpoint requires authentication (normal)')
      } else if (response.ok) {
        const data = await response.json()
        console.log('   ✅ Analytics endpoint working without auth')
        console.log(`   Revenue: ₹${data.data?.summary?.totalRevenue || 'N/A'}`)
      } else {
        console.log('   ❌ Analytics endpoint failed')
      }
    } catch (error) {
      console.log('   ❌ Analytics endpoint error:', error.message)
    }
    
    // Check admin analytics endpoint
    console.log('\n3️⃣ Checking /api/admin/analytics (requires auth)...')
    try {
      const response = await fetch(`${apiBase}/admin/analytics`)
      console.log(`   Status: ${response.status}`)
      if (response.status === 401) {
        console.log('   ✅ Admin analytics requires authentication (normal)')
      } else if (response.ok) {
        const data = await response.json()
        console.log('   ✅ Admin analytics working without auth')
        console.log(`   Revenue: ₹${data.data?.summary?.totalRevenue || 'N/A'}`)
      } else {
        console.log('   ❌ Admin analytics failed')
      }
    } catch (error) {
      console.log('   ❌ Admin analytics error:', error.message)
    }
    
    console.log('\n🎯 DIAGNOSIS:')
    console.log('If /api/orders/stats shows ₹0 revenue but our fix shows ₹7316, then:')
    console.log('1. ✅ Backend data is correct (our fix worked)')
    console.log('2. ❌ Admin panel is using stale/cached data')
    console.log('3. 🔧 Need to check the orderController stats calculation')
    
  } catch (error) {
    console.error('❌ API check failed:', error)
  }
}

// Run the check
checkAdminAPI()
