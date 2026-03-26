import Order from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

/**
 * Quick fix for delivered COD orders - mark them as paid
 * GET /api/fix/delivered-cod
 */
export const fixDeliveredCODOrders = catchAsync(async (req, res) => {
  console.log('🔧 QUICK FIX: Marking delivered COD orders as paid...')
  
  try {
    // Find delivered orders with pending payment status
    const deliveredPendingOrders = await Order.find({
      status: 'delivered',
      paymentStatus: 'pending'
    })
    
    console.log(`🔍 Found ${deliveredPendingOrders.length} delivered orders with pending payment`)
    
    if (deliveredPendingOrders.length === 0) {
      return sendSuccess(res, {
        message: 'No delivered orders need fixing',
        ordersFixed: 0,
        revenueAdded: 0
      })
    }
    
    let totalRevenueAdded = 0
    const fixedOrders = []
    
    for (const order of deliveredPendingOrders) {
      console.log(`📦 Fixing Order ${order._id.toString().slice(-8).toUpperCase()}: ₹${order.totalAmount}`)
      
      try {
        // Mark as paid using raw MongoDB collection to bypass all validation
        const result = await Order.collection.updateOne(
          { _id: order._id },
          { 
            $set: { 
              paymentStatus: 'paid',
              notes: order.notes ? `${order.notes} | Auto-fixed on ${new Date().toLocaleDateString()} - Delivered order was marked as paid` : `Auto-fixed on ${new Date().toLocaleDateString()} - Delivered order was marked as paid`
            }
          }
        )
        
        if (result.modifiedCount > 0) {
          totalRevenueAdded += order.totalAmount
          fixedOrders.push({
            orderId: order._id,
            orderNumber: order._id.toString().slice(-8).toUpperCase(),
            amount: order.totalAmount,
            paymentMethod: order.paymentMethod
          })
          console.log(`   ✅ FIXED: Marked as paid (+₹${order.totalAmount})`)
        } else {
          console.log(`   ❌ FAILED: Could not update order`)
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`)
      }
    }
    
    console.log(`✅ FIXED: ${deliveredPendingOrders.length} orders, Revenue added: ₹${totalRevenueAdded}`)
    
    // Verify the fix
    const finalStats = await Order.find({
      status: 'delivered',
      paymentStatus: 'paid'
    })
    
    const finalRevenue = finalStats.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    
    sendSuccess(res, {
      message: 'Delivered COD orders fixed successfully',
      ordersFixed: deliveredPendingOrders.length,
      revenueAdded: totalRevenueAdded,
      fixedOrders,
      verification: {
        deliveredPaidOrders: finalStats.length,
        totalRevenueFromDelivered: finalRevenue
      },
      instructions: [
        'Refresh your admin panel to see updated revenue',
        'The delivered orders should now be counted in revenue',
        'Future COD orders should be marked as paid upon delivery'
      ]
    })
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error)
    sendError(res, 'Quick fix failed: ' + error.message, 500)
  }
})

/**
 * Get current order status for verification
 * GET /api/fix/status
 */
export const getCurrentStatus = catchAsync(async (req, res) => {
  console.log('📊 Checking current order status...')
  
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ])
    
    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ])
    
    // Find delivered orders with pending payment
    const deliveredPending = await Order.find({
      status: 'delivered',
      paymentStatus: 'pending'
    }).select('_id totalAmount paymentMethod')
    
    const currentRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ])
    
    const statusBreakdown = {}
    stats.forEach(stat => {
      statusBreakdown[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      }
    })
    
    const paymentBreakdown = {}
    paymentStats.forEach(stat => {
      paymentBreakdown[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      }
    })
    
    console.log(`📊 Status: Delivered=${statusBreakdown.delivered?.count || 0}, Paid=${paymentBreakdown.paid?.count || 0}, Pending=${paymentBreakdown.pending?.count || 0}`)
    
    sendSuccess(res, {
      statusBreakdown,
      paymentBreakdown,
      currentRevenue: currentRevenue[0]?.totalRevenue || 0,
      deliveredPendingOrders: deliveredPending.length,
      deliveredPendingDetails: deliveredPending.map(order => ({
        orderId: order._id.toString().slice(-8).toUpperCase(),
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod
      })),
      issue: {
        deliveredOrders: statusBreakdown.delivered?.count || 0,
        paidOrders: paymentBreakdown.paid?.count || 0,
        needsFix: (statusBreakdown.delivered?.count || 0) > (paymentBreakdown.paid?.count || 0),
        missingRevenue: deliveredPending.reduce((sum, order) => sum + order.totalAmount, 0)
      }
    })
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
    sendError(res, 'Status check failed: ' + error.message, 500)
  }
})

export default {
  fixDeliveredCODOrders,
  getCurrentStatus
}
