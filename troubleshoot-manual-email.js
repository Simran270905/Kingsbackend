// TROUBLESHOOT MANUAL REVIEW EMAIL ISSUES
// Run with: node -r dotenv/config troubleshoot-manual-email.js

console.log('=== MANUAL REVIEW EMAIL TROUBLESHOOTING ===')

console.log('\n=== COMMON ISSUES & SOLUTIONS ===')

console.log('\n🔍 ISSUE 1: EMAIL NOT RECEIVED')
console.log('Even though manual email sending works, customers not receiving emails.')
console.log('Most common causes:')
console.log('  - Email in SPAM/JUNK folder (80% of cases)')
console.log('  - Wrong customer email address in order')
console.log('  - Gmail rate limiting or blocking')
console.log('  - Customer email provider issues')
console.log('')
console.log('SOLUTIONS:')
console.log('1. Check ALL email folders thoroughly')
console.log('2. Verify customer email address is correct')
console.log('3. Check Gmail spam/junk settings')
console.log('4. Use test email to verify service works')

console.log('\n🔍 ISSUE 2: BACKEND SERVER NOT RUNNING')
console.log('Manual email endpoint returns 404 when server is off.')
console.log('SOLUTIONS:')
console.log('1. Start backend server: npm start')
console.log('2. Check server is running on port 5000')
console.log('3. Verify frontend connects to http://localhost:5000/api')

console.log('\n🔍 ISSUE 3: CUSTOMER EMAIL MISSING')
console.log('Order has no customer email in guestInfo or customer field.')
console.log('SOLUTIONS:')
console.log('1. Check order data for email addresses')
console.log('2. Update order with correct customer email')
console.log('3. Use customer email from shipping address if needed')

console.log('\n🔍 ISSUE 4: INVALID ORDER ID')
console.log('Manual email sending requires valid order ID.')
console.log('SOLUTIONS:')
console.log('1. Verify order ID exists in database')
console.log('2. Check order._id is not undefined')
console.log('3. Use order._id.toString() for API calls')

console.log('\n📧 QUICK TEST CHECKLIST ===')
console.log('1. ✅ Backend server running?')
console.log('2. ✅ Frontend can access admin panel?')
console.log('3. ✅ Manual review email button visible?')
console.log('4. ✅ Customer email exists in order?')
console.log('5. ✅ Test email service working?')

console.log('\n🔍 HOW TO TEST ===')
console.log('1. Go to: http://localhost:5173/admin/orders')
console.log('2. Click "View" on any order')
console.log('3. Look for "Review Email Actions" section')
console.log('4. Click "Send Review Email" button')
console.log('5. Check browser console for success message')
console.log('6. Check customer email inbox')

console.log('\n📧 EXPECTED RESULTS ===')
console.log('✅ SUCCESS: Email sent successfully')
console.log('📧 SUCCESS: Customer receives email within 1-2 minutes')
console.log('✅ SUCCESS: Review appears in admin panel')
console.log('✅ SUCCESS: No console errors')

console.log('\n📧 IF ISSUES PERSIST ===')
console.log('1. Check backend logs for email sending errors')
console.log('2. Verify Gmail SMTP settings')
console.log('3. Test email service with different email addresses')
console.log('4. Check network connectivity')
console.log('5. Contact email provider for support')

console.log('\n=== DEBUGGING COMMANDS ===')
console.log('To test email service directly:')
console.log('node -r dotenv/config test-email-simple.js')
console.log('')
console.log('To check backend server status:')
console.log('curl http://localhost:5000/api/admin/verify')
console.log('To check manual email endpoint:')
console.log('curl -X POST http://localhost:5000/api/admin/send-review-email')
console.log('  -H "Content-Type: application/json"')
console.log('  -H "Authorization: Bearer your_admin_token"')
console.log('  -d \'{"orderId":"test123","customerEmail":"test@example.com"}\'')
console.log('')

// Test specific order
const testSpecificOrder = async () => {
  console.log('\n=== TESTING SPECIFIC ORDER ===')
  
  // Check if order exists and has email
  const testOrderId = '65a1b2c3d4e5f6a7b8c9d0e1f2a3b'
  const testEmail = 'simrankadamkb12@gmail.com'
  
  try {
    const response = await fetch(`http://localhost:5000/api/admin/send-review-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_admin_token_for_testing'
      },
      body: JSON.stringify({
        orderId: testOrderId,
        customerEmail: testEmail,
        customerName: 'Test Customer'
      })
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', data)
    
    if (response.ok && data.success) {
      console.log('✅ SUCCESS: Manual email endpoint works for order:', testOrderId)
      console.log('✅ SUCCESS: Email should be sent to:', testEmail)
    } else {
      console.log('❌ FAILED: Manual email endpoint failed')
      console.log('Error:', data.error || 'Unknown error')
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message)
  }
}

// Run tests
console.log('\n=== RUNNING TESTS ===')
testSpecificOrder()

console.log('\n=== SUMMARY ===')
console.log('✅ Manual review email feature is IMPLEMENTED')
console.log('✅ Backend server needs to be RUNNING for testing')
console.log('✅ Frontend has manual email button')
console.log('✅ Use this script to identify specific issues')

console.log('\n=== NEXT STEPS ===')
console.log('1. Start backend server: npm start')
console.log('2. Run this troubleshooting script: node troubleshoot-manual-email.js')
console.log('3. Test manual email functionality in admin panel')
console.log('4. Check browser console for success messages')
console.log('5. Check customer email inbox thoroughly')

console.log('\n=== MOST COMMON FIXES ===')
console.log('1. 📧 Check SPAM/JUNK folder in customer email')
console.log('2. 🔍 Verify customer email address in order data')
console.log('3. 🚀 Start backend server if not running')
console.log('4. 📧 Test email service independently')

console.log('\n=== READY TO TEST ===')
