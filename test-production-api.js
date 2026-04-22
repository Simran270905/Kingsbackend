import fetch from 'node-fetch'

// Test the production API directly
async function testProductionAPI() {
  try {
    console.log('=== TESTING PRODUCTION API ===')
    
    // Test data
    const testData = {
      orderId: '69e679bf0a9eb574729bbd7e',
      productId: '69e0e4c67e00858242a73f82',
      rating: 5,
      comment: 'Test review from backend script',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmRlcklkIjoiNjllNjc5YmYwYTllYjU3NDcyOWJiZDdlIiwiZW1haWwiOiJjdXN0b21lckBleGFtcGxlLmNvbSIsImV4cGlyZXMiOjE3Nzc0OTE2NzI2MTUsImdlbmVyYXRlZCI6MTc3Njg4Njg3MjYxNn0.42578fb38e70f6fa957ec0e702b4e84709116a0bc6103f164f3724d6aca91f62'
    }
    
    console.log('Test data:', testData)
    
    // Test API call to production
    console.log('\n=== TESTING PRODUCTION API CALL ===')
    const response = await fetch('https://api.kkingsjewellery.com/api/reviews/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers))
    
    const responseData = await response.text()
    console.log('Response body:', responseData)
    
    try {
      const jsonResponse = JSON.parse(responseData)
      console.log('Parsed JSON response:', jsonResponse)
    } catch (e) {
      console.log('Response is not valid JSON')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
    console.error('Error stack:', error.stack)
  }
}

testProductionAPI()
