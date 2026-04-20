import mongoose from 'mongoose'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const syncSoldCounts = async () => {
  try {
    console.log(' Starting sold counts synchronization...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
    console.log(' Connected to MongoDB')
    
    // Step 1: Reset all sold counts to 0
    console.log(' Step 1: Resetting all product sold counts to 0...')
    await Product.updateMany({}, { sold: 0 })
    console.log(' All sold counts reset to 0')
    
    // Step 2: Calculate sold counts from Orders (Single Source of Truth)
    console.log(' Step 2: Calculating sold counts from Orders...')
    
    // Get all valid orders (paid and not cancelled)
    const validOrders = await Order.find({
      paymentStatus: 'paid',
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    }).lean()
    
    console.log(` Found ${validOrders.length} valid orders for sold calculation`)
    
    // Calculate sold counts per product
    const productSoldMap = new Map()
    
    validOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId.toString()
        const currentSold = productSoldMap.get(productId) || 0
        productSoldMap.set(productId, currentSold + item.quantity)
      })
    })
    
    console.log(` Calculated sold counts for ${productSoldMap.size} products`)
    
    // Step 3: Update products with correct sold counts
    console.log(' Step 3: Updating products with correct sold counts...')
    
    let updatedCount = 0
    for (const [productId, soldCount] of productSoldMap.entries()) {
      try {
        await Product.findByIdAndUpdate(productId, { 
          sold: soldCount,
          salesCount: soldCount 
        })
        updatedCount++
        
        if (updatedCount % 10 === 0) {
          console.log(` Updated ${updatedCount} products...`)
        }
      } catch (error) {
        console.error(` Failed to update product ${productId}:`, error.message)
      }
    }
    
    console.log(` Successfully updated ${updatedCount} products with sold counts`)
    
    // Step 4: Verification
    console.log(' Step 4: Verification...')
    
    // Calculate total sold from products
    const totalSoldFromProducts = await Product.aggregate([
      { $group: { _id: null, totalSold: { $sum: '$sold' } } }
    ])
    
    // Calculate total sold from orders
    const totalSoldFromOrders = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      { $unwind: '$items' },
      { $group: { _id: null, totalSold: { $sum: '$items.quantity' } } }
    ])
    
    const productsTotal = totalSoldFromProducts[0]?.totalSold || 0
    const ordersTotal = totalSoldFromOrders[0]?.totalSold || 0
    
    console.log(` Verification Results:`)
    console.log(` Total Sold from Products: ${productsTotal}`)
    console.log(` Total Sold from Orders: ${ordersTotal}`)
    console.log(` Match: ${productsTotal === ordersTotal ? 'YES' : 'NO'}`)
    
    if (productsTotal === ordersTotal) {
      console.log(' SUCCESS: Sold counts are now synchronized!')
    } else {
      console.log(' WARNING: Mismatch found. Please investigate.')
    }
    
    // Step 5: Show top selling products
    console.log('\n Step 5: Top Selling Products:')
    const topProducts = await Product.find({ sold: { $gt: 0 } })
      .sort({ sold: -1 })
      .limit(10)
      .select('name sold')
      .lean()
    
    topProducts.forEach((product, index) => {
      console.log(` ${index + 1}. ${product.name}: ${product.sold} sold`)
    })
    
  } catch (error) {
    console.error(' Sync failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log(' Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the sync
syncSoldCounts()
