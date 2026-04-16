import Order, { default as OrderDefault } from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

/**
 * Update COD order payment status when cash is collected
 * PUT /api/orders/:id/mark-cod-paid
 */
export const markCODOrderAsPaid = catchAsync(async (req, res) => {
  const { id } = req.params
  
  console.log(`💵 Marking COD order ${id} as paid...`)
  
  const order = await Order.findById(id)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  if (order.paymentMethod !== 'cod') {
    return sendError(res, 'This is not a COD order', 400)
  }
  
  if (order.paymentStatus === 'paid') {
    return sendError(res, 'Order payment is already marked as paid', 400)
  }
  
  if (order.status !== 'delivered') {
    return sendError(res, 'Order must be delivered before marking payment as collected', 400)
  }
  
  // Update payment status to paid
  order.paymentStatus = 'paid'
  order.notes = order.notes ? `${order.notes} | Cash collected on ${new Date().toLocaleDateString()}` : `Cash collected on ${new Date().toLocaleDateString()}`
  
  await order.save()
  
  console.log(`✅ COD order ${id} marked as paid - Revenue: ₹${order.totalAmount}`)
  
  sendSuccess(res, {
    orderId: order._id,
    orderNumber: order._id.toString().slice(-8).toUpperCase(),
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    message: 'COD payment marked as collected successfully'
  })
})

/**
 * Get COD orders pending payment collection
 * GET /api/orders/cod/pending-payment
 */
export const getCODOrdersPendingPayment = catchAsync(async (req, res) => {
  console.log('📋 Fetching COD orders pending payment collection...')
  
  const codOrders = await Order.find({
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    status: 'delivered' // Only delivered orders where cash should be collected
  })
  .populate('userId', 'name email mobile')
  .sort({ deliveredAt: -1 })
  .lean()
  
  console.log(`📊 Found ${codOrders.length} COD orders pending payment collection`)
  
  const totalPendingAmount = codOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  
  sendSuccess(res, {
    orders: codOrders,
    totalOrders: codOrders.length,
    totalPendingAmount: Math.round(totalPendingAmount * 100) / 100,
    message: `${codOrders.length} COD orders pending payment collection worth ₹${totalPendingAmount.toFixed(2)}`
  })
})

/**
 * Get COD payment collection statistics
 * GET /api/orders/cod/payment-stats
 */
export const getCODPaymentStats = catchAsync(async (req, res) => {
  console.log('📊 Fetching COD payment statistics...')
  
  const stats = await Order.aggregate([
    {
      $match: { paymentMethod: 'cod' }
    },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ])
  
  const result = {
    pending: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    refunded: { count: 0, amount: 0 }
  }
  
  stats.forEach(stat => {
    if (result[stat._id]) {
      result[stat._id] = {
        count: stat.count,
        amount: Math.round(stat.totalAmount * 100) / 100
      }
    }
  })
  
  // Get delivered but unpaid COD orders
  const deliveredUnpaid = await Order.countDocuments({
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    status: 'delivered'
  })
  
  result.deliveredUnpaid = deliveredUnpaid
  
  console.log(`📈 COD Stats - Pending: ₹${result.pending.amount}, Paid: ₹${result.paid.amount}, Delivered Unpaid: ${deliveredUnpaid}`)
  
  sendSuccess(res, {
    ...result,
    totalCODOrders: Object.values(result).reduce((sum, val) => {
      if (typeof val === 'object' && val.count) return sum + val.count
      return sum
    }, 0)
  })
})

/**
 * Bulk update multiple COD orders as paid
 * POST /api/orders/cod/mark-multiple-paid
 */
export const markMultipleCODAsPaid = catchAsync(async (req, res) => {
  const { orderIds } = req.body
  
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return sendError(res, 'Valid order IDs array is required', 400)
  }
  
  console.log(`💵 Marking ${orderIds.length} COD orders as paid...`)
  
  const results = {
    updated: [],
    failed: []
  }
  
  for (const orderId of orderIds) {
    try {
      const order = await Order.findById(orderId)
      
      if (!order) {
        results.failed.push({ orderId, error: 'Order not found' })
        continue
      }
      
      if (order.paymentMethod !== 'cod') {
        results.failed.push({ orderId, error: 'Not a COD order' })
        continue
      }
      
      if (order.paymentStatus === 'paid') {
        results.failed.push({ orderId, error: 'Already paid' })
        continue
      }
      
      if (order.status !== 'delivered') {
        results.failed.push({ orderId, error: 'Order not delivered' })
        continue
      }
      
      // Mark as paid using raw MongoDB collection to bypass all validation
      const result = await Order.collection.updateOne(
        { _id: order._id },
        { 
          $set: { 
            paymentStatus: 'paid',
            amountPaid: order.totalAmount, // Set the full amount as paid
            paymentDate: new Date(), // Set payment date to now
            notes: order.notes ? `${order.notes} | Cash collected on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}` : `Cash collected on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
          }
        }
      )
      
      results.updated.push({
        orderId: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        amount: order.totalAmount
      })
      
    } catch (error) {
      results.failed.push({ orderId, error: error.message })
    }
  }
  
  const totalAmountCollected = results.updated.reduce((sum, order) => sum + order.amount, 0)
  
  console.log(`✅ Updated ${results.updated.length} COD orders as paid - Total collected: ₹${totalAmountCollected}`)
  
  sendSuccess(res, {
    results,
    totalUpdated: results.updated.length,
    totalFailed: results.failed.length,
    totalAmountCollected: Math.round(totalAmountCollected * 100) / 100,
    message: `Successfully marked ${results.updated.length} orders as paid`
  })
})

export default {
  markCODOrderAsPaid,
  getCODOrdersPendingPayment,
  getCODPaymentStats,
  markMultipleCODAsPaid
}
