import dotenv from 'dotenv'
dotenv.config()

/**
 * Test the exact API endpoint the admin panel should be using
 */

const testDirectAPI = async () => {
  console.log('🔧 TESTING DIRECT API CALLS')
  console.log('=' .repeat(40))
  
  const apiBase = 'http://localhost:5000/api'
  
  try {
    // Test the exact endpoint
    console.log('\n📊 Testing /api/orders/stats (exact endpoint):')
    
    const response = await fetch(`${apiBase}/orders/stats`)
    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response Headers:', Object.fromEntries(response.headers))
    
    if (response.ok) {
      console.log('\n✅ SUCCESSFUL RESPONSE:')
      console.log(JSON.stringify(data, null, 2))
      
      console.log('\n🎯 KEY DATA:')
      console.log(`Revenue: ₹${data.data.revenue}`)
      console.log(`Total Orders: ${data.data.total}`)
      console.log(`Paid Orders: ${data.data.paymentStatus.paid}`)
      console.log(`Delivered Orders: ${data.data.delivered}`)
      
      if (data.data.revenue > 0) {
        console.log('\n🎉 BACKEND IS CORRECT!')
        console.log('The issue is definitely in your frontend/admin panel.')
        console.log('\n🔧 FRONTEND FIXES:')
        console.log('1. Hard refresh admin panel (Ctrl+F5)')
        console.log('2. Clear browser cache')
        console.log('3. Check browser console for errors')
        console.log('4. Verify frontend API calls in Network tab')
        console.log('5. Restart frontend development server')
      } else {
        console.log('\n❌ BACKEND STILL SHOWS ₹0')
        console.log('There might be another issue with the backend.')
      }
    } else {
      console.log('❌ API call failed:', data)
    }
    
  } catch (error) {
    console.error('❌ Direct API test failed:', error)
  }
}

// Run the test
testDirectAPI()
