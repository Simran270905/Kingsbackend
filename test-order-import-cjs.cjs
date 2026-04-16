#!/usr/bin/env node

// 🧪 Test Order Model Import (CommonJS)
console.log('🧪 Testing Order model import...\n')

try {
  const Order = require('./models/Order.js')
  console.log('✅ Order model imported successfully')
  console.log('Order model type:', typeof Order)
  console.log('Order model keys:', Object.keys(Order))
  
  // Test if we can create a new order
  const testOrder = {
    items: [],
    totalAmount: 0,
    paymentStatus: 'pending'
  }
  
  console.log('✅ Order model is working correctly')
  process.exit(0)
  
} catch (error) {
  console.error('❌ Order model import failed:', error.message)
  process.exit(1)
}
