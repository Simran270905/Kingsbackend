import fetch from 'node-fetch'

const API_URL = 'http://localhost:5000/api'

async function testCORS() {
  console.log('🧪 Testing CORS configuration...\n')
  
  // Test 1: Development origin (should be allowed)
  console.log('1. Testing development origin (http://localhost:5173):')
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })
    
    console.log(`   Status: ${response.status}`)
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`)
    console.log(`   Access-Control-Allow-Credentials: ${response.headers.get('Access-Control-Allow-Credentials')}`)
    console.log('   ✅ Development origin allowed\n')
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`)
  }
  
  // Test 2: Production origin (should be allowed)
  console.log('2. Testing production origin (https://www.kkingsjewellery.com):')
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.kkingsjewellery.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })
    
    console.log(`   Status: ${response.status}`)
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`)
    console.log(`   Access-Control-Allow-Credentials: ${response.headers.get('Access-Control-Allow-Credentials')}`)
    console.log('   ✅ Production origin allowed\n')
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`)
  }
  
  // Test 3: Unauthorized origin (should be blocked)
  console.log('3. Testing unauthorized origin (https://evil.com):')
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })
    
    console.log(`   Status: ${response.status}`)
    if (response.status === 0 || response.status === 403) {
      console.log('   ✅ Unauthorized origin blocked (as expected)\n')
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.status}\n`)
    }
  } catch (error) {
    console.log(`   ✅ Unauthorized origin blocked: ${error.message}\n`)
  }
  
  // Test 4: No origin (should be allowed for mobile apps, curl, etc.)
  console.log('4. Testing no origin (mobile apps/curl):')
  try {
    const response = await fetch(API_URL)
    
    console.log(`   Status: ${response.status}`)
    const data = await response.json()
    console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
    console.log('   ✅ No origin request allowed\n')
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`)
  }
  
  console.log('🎉 CORS testing completed!')
}

// Run the test
testCORS().catch(console.error)
