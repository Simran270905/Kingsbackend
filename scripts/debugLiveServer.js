import dotenv from 'dotenv'
dotenv.config()

/**
 * Debug the live server API response structure
 */

const debugLiveServer = async () => {
  console.log('🔍 DEBUGGING LIVE SERVER API RESPONSE')
  console.log('=' .repeat(50))
  
  const liveApiBase = 'https://kingsbackend-y3fu.onrender.com/api'
  
  try {
    console.log('\n1️⃣ TESTING LIVE SERVER API RESPONSE')
    try {
      const response = await fetch(`${liveApiBase}/orders/stats`)
      const data = await response.json()
      
      console.log('✅ Live server API responded')
      console.log('📊 Full Response Structure:')
      console.log(JSON.stringify(data, null, 2))
      
      if (response.ok && data.success) {
        console.log('\n🔍 Data Structure Analysis:')
        console.log('✅ Response success:', data.success)
        console.log('✅ Message:', data.message)
        console.log('✅ Data exists:', !!data.data)
        
        if (data.data) {
          console.log('\n📋 Data Fields:')
          Object.keys(data.data).forEach(key => {
            console.log(`   ${key}:`, typeof data.data[key], '=', data.data[key])
          })
          
          console.log('\n💰 Payment Status Analysis:')
          if (data.data.paymentStatus) {
            console.log('✅ paymentStatus field exists')
            console.log('   paymentStatus:', data.data.paymentStatus)
            console.log('   Type:', typeof data.data.paymentStatus)
            console.log('   Keys:', Object.keys(data.data.paymentStatus))
            
            if (data.data.paymentStatus.paid !== undefined) {
              console.log('✅ paid field exists:', data.data.paymentStatus.paid)
            } else {
              console.log('❌ paid field missing - this is causing the error!')
            }
          } else {
            console.log('❌ paymentStatus field missing completely')
          }
          
          console.log('\n📊 Revenue Analysis:')
          console.log('   Revenue:', data.data.revenue)
          console.log('   Total Orders:', data.data.total)
          console.log('   Delivered Orders:', data.data.delivered)
          
          console.log('\n💡 Expected vs Actual:')
          console.log('   Expected paymentStatus: { paid: number, pending: number, ... }')
          console.log('   Actual paymentStatus:', data.data.paymentStatus)
        }
      }
    } else {
      console.log('❌ Live server API failed:', data.message)
    }
  } catch (error) {
    console.error('❌ Live server API error:', error.message)
  }
  
  console.log('\n🎯 SOLUTION RECOMMENDATIONS:')
  console.log('1. If paymentStatus is missing:')
  console.log('   - Backend needs to include paymentStatus in API response')
  console.log('   - Update /api/orders/stats endpoint to include paymentStatus')
  console.log('   - Ensure orders have paymentStatus field in database')
  
  console.log('\n2. If paymentStatus exists but paid field is missing:')
  console.log('   - Check database schema for paymentStatus field')
  console.log('   - Ensure orders have paymentStatus set correctly')
  console.log('   - Update backend to include all payment status options')
  
  console.log('\n3. Temporary fix:')
  console.log('   - Use delivered orders count for revenue estimation')
  console.log('   - Show total orders instead of paid orders')
  console.log('   - Add fallback for missing paymentStatus field')
}

// Run the debug
debugLiveServer()
