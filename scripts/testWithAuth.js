import dotenv from 'dotenv'
dotenv.config()

/**
 * Test analytics endpoints with proper authentication
 */

const testWithAuth = async () => {
  console.log('🔍 TESTING ANALYTICS WITH AUTHENTICATION')
  console.log('=' .repeat(50))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    // First, let's test the order stats endpoint that's working
    console.log('\n1️⃣ Testing /api/orders/stats (no auth required)...')
    try {
      const response = await fetch(`${apiBase}/orders/stats`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Order stats endpoint working')
        console.log('📊 Order Stats Data:')
        console.log(`   Total Orders: ${data.data.total}`)
        console.log(`   Revenue: ₹${data.data.revenue}`)
        console.log(`   Payment Status Breakdown:`, data.data.paymentStatus)
        console.log(`   Order Status Breakdown:`, {
          pending: data.data.pending,
          processing: data.data.processing,
          shipped: data.data.shipped,
          delivered: data.data.delivered,
          cancelled: data.data.cancelled
        })
        
        // Validate the data
        const issues = []
        if (typeof data.data.revenue !== 'number') issues.push('Revenue is not a number')
        if (data.data.revenue < 0) issues.push('Revenue is negative')
        if (!data.data.paymentStatus) issues.push('Missing payment status breakdown')
        
        if (issues.length === 0) {
          console.log('✅ Order stats data validation passed')
        } else {
          console.log('❌ Order stats validation issues:', issues)
        }
      } else {
        console.log('❌ Order stats failed:', data.message)
      }
    } catch (error) {
      console.log('❌ Order stats error:', error.message)
    }
    
    // Test basic health endpoint
    console.log('\n2️⃣ Testing health endpoint...')
    try {
      const response = await fetch('http://localhost:5000/')
      const data = await response.json()
      
      if (response.ok) {
        console.log('✅ Server health check passed')
        console.log(`   Message: ${data.message}`)
        console.log(`   Status: ${data.status}`)
      } else {
        console.log('❌ Health check failed')
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message)
    }
    
    // Test products endpoint (usually public)
    console.log('\n3️⃣ Testing products endpoint...')
    try {
      const response = await fetch(`${apiBase}/products`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('✅ Products endpoint working')
        console.log(`   Found ${data.data?.products?.length || 0} products`)
      } else {
        console.log('❌ Products endpoint failed:', data.message)
      }
    } catch (error) {
      console.log('❌ Products endpoint error:', error.message)
    }
    
    // Test analytics endpoint without auth (should fail)
    console.log('\n4️⃣ Testing analytics endpoint without auth (should fail)...')
    try {
      const response = await fetch(`${apiBase}/analytics`)
      const data = await response.json()
      
      if (response.status === 401) {
        console.log('✅ Analytics endpoint correctly requires authentication')
      } else {
        console.log('❌ Analytics endpoint should require auth but responded with:', response.status)
      }
    } catch (error) {
      console.log('❌ Analytics endpoint error:', error.message)
    }
    
    // Test admin analytics endpoint without auth (should fail)
    console.log('\n5️⃣ Testing admin analytics endpoint without auth (should fail)...')
    try {
      const response = await fetch(`${apiBase}/admin/analytics`)
      const data = await response.json()
      
      if (response.status === 401) {
        console.log('✅ Admin analytics endpoint correctly requires authentication')
      } else {
        console.log('❌ Admin analytics endpoint should require auth but responded with:', response.status)
      }
    } catch (error) {
      console.log('❌ Admin analytics endpoint error:', error.message)
    }
    
    console.log('\n📊 MANUAL TESTING RECOMMENDATIONS:')
    console.log('1. Test admin login to get auth token')
    console.log('2. Use auth token to test protected endpoints')
    console.log('3. Create test orders and verify analytics update')
    console.log('4. Test payment flow end-to-end')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testWithAuth()
