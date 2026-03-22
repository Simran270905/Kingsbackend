import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from '../models/Product.js'

dotenv.config()

async function clearAllProducts() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('🗑️  Clearing all products from database...')
    
    const result = await Product.deleteMany({})
    
    console.log(`✅ Deleted ${result.deletedCount} products\n`)
    
    const remainingCount = await Product.countDocuments()
    console.log(`📊 Remaining products in database: ${remainingCount}`)
    
    console.log('\n✅ Product database cleared successfully!')
    console.log('\n📍 Next Steps:')
    console.log('1. Clear localStorage on client:')
    console.log('   - Open browser console')
    console.log('   - Run: localStorage.clear()')
    console.log('   - Refresh page')
    console.log('2. Add products from Admin Panel → Add Product')
    console.log('3. Verify products appear in Admin → Products')
    console.log('4. Verify products appear on Client Website\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing products:', error)
    process.exit(1)
  }
}

clearAllProducts()
