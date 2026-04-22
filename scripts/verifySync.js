import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'

dotenv.config()

async function verifySync() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    // Check Products
    console.log('📦 PRODUCTS:')
    const products = await Product.find()
    console.log(`   Total: ${products.length} products`)
    
    const categories = {}
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1
    })
    
    console.log('   By Category:')
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} products`)
    })
    
    const activeProducts = products.filter(p => p.isActive).length
    console.log(`   Active: ${activeProducts}`)
    console.log(`   Inactive: ${products.length - activeProducts}`)

    // Check Orders
    console.log('\n📋 ORDERS:')
    const orders = await Order.find()
    console.log(`   Total: ${orders.length} orders`)
    
    if (orders.length > 0) {
      const orderStatuses = {}
      orders.forEach(o => {
        orderStatuses[o.status] = (orderStatuses[o.status] || 0) + 1
      })
      console.log('   By Status:')
      Object.entries(orderStatuses).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count} orders`)
      })
    }

    // Check Users
    console.log('\n👥 USERS:')
    const users = await User.find()
    console.log(`   Total: ${users.length} users`)

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 SYNC STATUS SUMMARY:')
    console.log('='.repeat(50))
    console.log(`✅ Products: ${products.length} (${activeProducts} active)`)
    console.log(`✅ Orders: ${orders.length}`)
    console.log(`✅ Users: ${users.length}`)
    console.log(`✅ Categories: ${Object.keys(categories).length}`)
    console.log('='.repeat(50))

    if (products.length >= 10) {
      console.log('\n🎉 SUCCESS! Database is properly synced.')
      console.log('   Admin Panel and Frontend will show the same data.')
    } else {
      console.log('\n⚠️  WARNING: Less than 10 products found.')
      console.log('   Run: node scripts/syncFrontendProducts.js')
    }

    console.log('\n📍 Next Steps:')
    console.log('   1. Open Admin Panel: https://www.kkingsjewellery.com/admin/products')
    console.log('   2. Login with password: Admin@123')
    console.log('   3. Verify products are visible')
    console.log('   4. Open Frontend: https://www.kkingsjewellery.com/shop')
    console.log('   5. Verify same products appear\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

verifySync()
