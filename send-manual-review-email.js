// SEND MANUAL REVIEW EMAIL TEST
// Run with: node -r dotenv/config send-manual-review-email.js

console.log('=== MANUAL REVIEW EMAIL TEST ===')

import { sendReviewEmail } from './services/reviewEmailService.js'

// Create a test order object (simulate a delivered order)
const testOrder = {
  _id: '65a1b2c3d4e5f6a7b8c9d0e1f2a3b',
  guestInfo: {
    firstName: 'Test',
    email: process.env.EMAIL_USER // Send to yourself for testing
  },
  deliveredAt: new Date(),
  status: 'delivered'
}

console.log('\n=== TEST ORDER DETAILS ===')
console.log('Order ID:', testOrder._id.toString().slice(-8))
console.log('Customer Name:', testOrder.guestInfo.firstName)
console.log('Customer Email:', testOrder.guestInfo.email)
console.log('Delivered At:', testOrder.deliveredAt.toLocaleString())
console.log('Status:', testOrder.status)

console.log('\n=== SENDING TEST REVIEW EMAIL ===')
console.log('📧 Sending review email to:', testOrder.guestInfo.email)
console.log('📧 This simulates what happens when order is marked delivered')

const sendTestEmail = async () => {
  try {
    const result = await sendReviewEmail(testOrder)
    
    if (result) {
      console.log('✅ SUCCESS: Review email sent successfully!')
      console.log('📧 Check your inbox at:', testOrder.guestInfo.email)
      console.log('📂 Also check spam/junk folders')
      console.log('📋 Subject should be: "How was your KKINGS Jewellery experience?"')
    } else {
      console.log('❌ FAILED: Review email not sent')
      console.log('🔍 Check backend console for error messages')
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.log('🔧 Check email service configuration')
  }
}

console.log('\n=== WHAT THIS TEST DOES ===')
console.log('1. ✅ Tests the exact email service used for review emails')
console.log('2. ✅ Uses the same email template and configuration')
console.log('3. ✅ Sends to your own email address')
console.log('4. ✅ Simulates the automatic email sending process')
console.log('5. ✅ Verifies Gmail SMTP connection')

console.log('\n=== IF THIS EMAIL ARRIVES ===')
console.log('✅ Email service is WORKING')
console.log('✅ Gmail configuration is CORRECT')
console.log('✅ The issue is with order status detection')
console.log('✅ Check if orders are properly marked "delivered"')

console.log('\n=== IF THIS EMAIL DOESN\'T ARRIVE ===')
console.log('❌ Email service has ISSUES')
console.log('❌ Gmail configuration is WRONG')
console.log('❌ Network or SMTP problems')
console.log('❌ Need to fix email service first')

console.log('\n=== SENDING TEST EMAIL NOW ===')
sendTestEmail()
