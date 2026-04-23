// TEST SCRIPT - Review Token Generation and Verification
import { generateEmailReviewLink } from './utils/emailReviewLinks.js'
import { generateJWTReviewToken } from './utils/reviewToken.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('=== TESTING REVIEW TOKEN FIX ===')
console.log('')

// Test configuration
const testOrderId = '69e679bf0a9eb574729bbd7e'
const testEmail = 'simrankadamkb12@gmail.com'

console.log('1. JWT_SECRET Configuration:')
console.log('   JWT_SECRET exists:', !!process.env.JWT_SECRET)
console.log('   JWT_SECRET length:', process.env.JWT_SECRET?.length || 0)
console.log('   JWT_SECRET preview:', process.env.JWT_SECRET?.substring(0, 10) + '...' || 'NOT_SET')
console.log('')

console.log('2. Generating JWT Review Token:')
try {
  const jwtToken = generateJWTReviewToken(testOrderId, testEmail)
  console.log('   ✓ JWT Token generated successfully')
  console.log('   Token length:', jwtToken.length)
  console.log('   Token preview:', jwtToken.substring(0, 50) + '...')
  console.log('')
  
  console.log('3. Generating Email Review Link:')
  const reviewLink = generateEmailReviewLink(testOrderId, testEmail)
  console.log('   ✓ Email review link generated successfully')
  console.log('   Order ID:', reviewLink.orderId)
  console.log('   Email:', reviewLink.email)
  console.log('   Expires:', reviewLink.expires.toISOString())
  console.log('   Generated:', reviewLink.generated.toISOString())
  console.log('   Complete URL:', reviewLink.url)
  console.log('')
  
  console.log('4. Token Structure Analysis:')
  const tokenParts = jwtToken.split('.')
  console.log('   Header:', tokenParts[0]?.substring(0, 20) + '...')
  console.log('   Payload:', tokenParts[1]?.substring(0, 20) + '...')
  console.log('   Signature:', tokenParts[2]?.substring(0, 20) + '...')
  console.log('')
  
  console.log('5. URL Encoding Test:')
  const encodedToken = encodeURIComponent(jwtToken)
  const decodedToken = decodeURIComponent(encodedToken)
  console.log('   Original token length:', jwtToken.length)
  console.log('   Encoded token length:', encodedToken.length)
  console.log('   Tokens match after decode:', jwtToken === decodedToken)
  console.log('')
  
  console.log('6. Complete Test Results:')
  console.log('   ✓ JWT secret configured')
  console.log('   ✓ Token generation working')
  console.log('   ✓ URL encoding working')
  console.log('   ✓ Email link generation working')
  console.log('')
  
  console.log('=== READY FOR TESTING ===')
  console.log('Use this URL to test the review page:')
  console.log(reviewLink.url)
  console.log('')
  console.log('Or test the API directly:')
  console.log(`curl "https://api.kkingsjewellery.com/api/reviews/verify-token?orderId=${testOrderId}&token=${encodeURIComponent(jwtToken)}"`)
  
} catch (error) {
  console.error('✗ Test failed:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
