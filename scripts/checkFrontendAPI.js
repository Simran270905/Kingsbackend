import dotenv from 'dotenv'
dotenv.config()

/**
 * Check what API endpoint the frontend might be calling
 */

const checkFrontendAPI = async () => {
  console.log('🔍 CHECKING POSSIBLE FRONTEND API ENDPOINTS')
  console.log('=' .repeat(55))
  
  // Check different possible API URLs the frontend might be using
  const possibleAPIs = [
    'http://localhost:5000/api/orders/stats',
    'https://api.kkingsjewellery.com/api/orders/stats',  // Production API
    'https://api.kkingsjewellery.com/api/orders/stats',  // Production API (duplicate)
    'https://api.kkingsjewellery.com/api/orders/stats',  // Production API (duplicate)
  ]
  
  console.log('\n🔧 Testing different API endpoints your frontend might be calling:')
  
  for (const apiUrl of possibleAPIs) {
    try {
      console.log(`\n📡 Testing: ${apiUrl}`)
      const response = await fetch(apiUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ SUCCESS - Revenue: ₹${data.data?.revenue || 'N/A'}`)
        
        if (data.data?.revenue > 0) {
          console.log(`   🎯 This endpoint shows correct revenue!`)
          console.log(`   💡 Your frontend should be using this URL: ${apiUrl}`)
        } else {
          console.log(`   ⚠️  This endpoint shows ₹0 revenue`)
        }
      } else {
        console.log(`   ❌ Failed - Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n🎯 DIAGNOSIS:')
  console.log('1. If only localhost:5000 shows correct revenue:')
  console.log('   ✅ Your frontend should use: http://localhost:5000/api')
  console.log('   🔧 Check your frontend .env or API configuration')
  
  console.log('\n2. If multiple endpoints work:')
  console.log('   🔧 Check which one your frontend is actually calling')
  console.log('   💡 Use browser Network tab to see the actual API calls')
  
  console.log('\n3. If none work except localhost:5000:')
  console.log('   ✅ Backend is running on port 5000 (correct)')
  console.log('   🔧 Frontend might be configured for wrong port')
  
  console.log('\n📋 FRONTEND CONFIGURATION CHECK:')
  console.log('Check these files in your frontend project:')
  console.log('- .env file (REACT_APP_API_URL or VITE_API_URL)')
  console.log('- api.js or config.js file')
  console.log('- Any hardcoded API URLs in components')
}

// Run the check
checkFrontendAPI()
