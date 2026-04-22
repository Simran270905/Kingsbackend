import mongoose from 'mongoose'
import Order from './models/Order.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

async function checkOrderStatus() {
  try {
    console.log('=== CHECKING ORDER STATUS ===')
    
    const orderId = '69e679bf0a9eb574729bbd7e'
    
    // Find the order
    const order = await Order.findById(orderId).lean()
    
    if (!order) {
      console.log('Order not found with ID:', orderId)
      return
    }
    
    console.log('Order found:')
    console.log('- Order ID:', order._id)
    console.log('- Status:', order.status)
    console.log('- Customer email:', order.customer?.email)
    console.log('- Guest email:', order.guestInfo?.email)
    console.log('- Items count:', order.items?.length || 0)
    
    if (order.items && order.items.length > 0) {
      console.log('Items in order:')
      order.items.forEach((item, index) => {
        console.log(`  ${index + 1}. Product ID: ${item.productId}, Name: ${item.name || 'N/A'}`)
      })
    }
    
    // Check if status matches delivered regex
    const isDelivered = /^delivered$/i.test(order.status)
    console.log('Is delivered (regex match):', isDelivered)
    
  } catch (error) {
    console.error('Error checking order:', error)
  } finally {
    await mongoose.disconnect()
  }
}

checkOrderStatus()
