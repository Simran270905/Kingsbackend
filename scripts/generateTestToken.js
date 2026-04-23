#!/usr/bin/env node

// Debug script for JWT token generation
import dotenv from 'dotenv'
import { generateJWTReviewToken } from '../utils/reviewToken.js'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('=== JWT TOKEN GENERATION DEBUG ===')
console.log('')

// Test configuration
const testOrderId = '69e679bf0a9eb574729bbd7e'
const testEmail = 'simrankadamkb12@gmail.com'

console.log('1. Environment Configuration:')
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development')
console.log('   Working directory:', process.cwd())
console.log('   .env path:', path.join(__dirname, '../.env'))
console.log('')

console.log('2. JWT_SECRET Analysis:')
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  console.log('   ❌ JWT_SECRET is NOT configured')
  console.log('   Please set JWT_SECRET in your .env file')
  process.exit(1)
} else {
  console.log('   ✅ JWT_SECRET is configured')
  console.log('   Secret length:', jwtSecret.length)
  console.log('   Secret preview:', jwtSecret.substring(0, 3) + '...' + jwtSecret.substring(jwtSecret.length - 3))
  console.log('   Secret starts with:', jwtSecret.substring(0, 10) + '...')
  console.log('   Secret ends with:', '...' + jwtSecret.substring(jwtSecret.length - 10))
}
console.log('')

console.log('3. Token Generation:')
try {
  const token = generateJWTReviewToken(testOrderId, testEmail)
  console.log('   ✅ Token generated successfully')
  console.log('   Token length:', token.length)
  console.log('   Token preview:', token.substring(0, 30) + '...')
  console.log('   Full token:', token)
  console.log('')
  
  console.log('4. Test URL Generation:')
  const safeToken = encodeURIComponent(token)
  const testUrl = `https://kkingsjewellery.com/review?orderId=${testOrderId}&token=${safeToken}`
  console.log('   Test URL:', testUrl)
  console.log('')
  
  console.log('5. Verification Command:')
  console.log('   curl "https://api.kkingsjewellery.com/api/reviews/verify-token?orderId=${testOrderId}&token=${safeToken}"')
  console.log('')
  
  console.log('6. Debug Commands:')
  console.log('   Check live secret: curl https://api.kkingsjewellery.com/api/reviews/debug-secret')
  console.log('   Generate test token: node scripts/generateTestToken.js')
  console.log('')
  
  console.log('=== READY FOR TESTING ===')
  console.log('Use the above URL and commands to test your JWT token setup.')
  
} catch (error) {
  console.error('   ❌ Token generation failed:', error.message)
  console.error('   Stack:', error.stack)
  process.exit(1)
}
