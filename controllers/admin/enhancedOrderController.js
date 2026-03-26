import Order from '../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

/**
 * Get all orders with payment details and filtering
 * GET /api/admin/orders/enhanced
 */
export const getAllOrdersEnhanced = catchAsync(async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentStatus, 
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query
    
    // Build query
    const query = {}
    
    // Add filters if provided
    if (status) {
      query.status = status
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod
    }
    
    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Sort options
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
    
    // Fetch orders with payment details
    const orders = await Order.find(query)
      .populate('userId', 'name email mobile')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query)
    
    // Get payment status breakdown
    const paymentStatusBreakdown = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ])
    
    // Get payment method breakdown
    const paymentMethodBreakdown = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
    ])
    
    // Calculate revenue from paid orders only
    const paidOrdersRevenue = await Order.aggregate([
      { $match: { ...query, paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ])
    
    const totalRevenue = paidOrdersRevenue[0]?.totalRevenue || 0
    
    console.log('📊 Enhanced Orders Retrieved:', {
      total: totalOrders,
      page: page,
      limit: limit,
      filters: { status, paymentStatus, paymentMethod },
      revenue: totalRevenue,
      paymentStatusBreakdown: paymentStatusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
      paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
    
    sendSuccess(res, {
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders,
          hasNext: skip + parseInt(limit) < totalOrders,
          hasPrev: page > 1
        },
        filters: {
          status,
          paymentStatus,
          paymentMethod,
          sortBy,
          sortOrder
        },
        stats: {
          totalRevenue,
          totalOrders,
          paymentStatusBreakdown: paymentStatusBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
          paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {})
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Enhanced orders fetch error:', error)
    sendError(res, error.message || 'Failed to fetch orders', 500)
  }
})

/**
 * Get order details with full payment information
 * GET /api/admin/orders/enhanced/:id
 */
export const getOrderDetailsEnhanced = catchAsync(async (req, res) => {
  try {
    const { id } = req.params
    
    const order = await Order.findById(id)
      .populate('userId', 'name email mobile')
      .populate('paymentId', 'razorpayOrderId razorpayPaymentId status amount')
      .lean()
    
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }
    
    // Format payment information for display
    const paymentInfo = {
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      transactionId: order.razorpayPaymentId || order.razorpayOrderId,
      amountPaid: order.amountPaid || 0,
      totalAmount: order.totalAmount,
      paymentDate: order.paymentDate,
      paymentId: order.paymentId
    }
    
    // Add payment status badge color
    const getPaymentStatusBadge = (status) => {
      switch (status) {
        case 'paid': return { color: 'green', text: 'Paid' }
        case 'pending': return { color: 'yellow', text: 'Pending' }
        case 'failed': return { color: 'red', text: 'Failed' }
        case 'refunded': return { color: 'orange', text: 'Refunded' }
        default: return { color: 'gray', text: status }
      }
    }
    
    const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus)
    
    console.log('📋 Enhanced Order Details Retrieved:', {
      orderId: order._id,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      transactionId: order.razorpayPaymentId,
      amountPaid: order.amountPaid,
      totalAmount: order.totalAmount,
      paymentDate: order.paymentDate
    })
    
    sendSuccess(res, {
      success: true,
      data: {
        order,
        paymentInfo,
        paymentStatusBadge
      }
    })
    
  } catch (error) {
    console.error('❌ Enhanced order details fetch error:', error)
    sendError(res, error.message || 'Failed to fetch order details', 500)
  }
})

/**
 * Mark COD order as paid with full payment details
 * PUT /api/admin/orders/:id/mark-cod-paid-enhanced
 */
export const markCODOrderAsPaidEnhanced = catchAsync(async (req, res) => {
  try {
    const { id } = req.params
    const { notes, collectionMethod = 'cash' } = req.body
    
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
    
    // Update order with full payment details
    const updateResult = await Order.updateOne(
      { _id: order._id },
      { 
        $set: { 
          paymentStatus: 'paid',
          amountPaid: order.totalAmount,
          paymentDate: new Date(),
          notes: order.notes ? `${order.notes} | ${notes} | Payment collected via ${collectionMethod} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}` : `Payment collected via ${collectionMethod} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          status: 'confirmed' // Update status to confirmed after payment
        }
      }
    )
    
    if (updateResult.modifiedCount > 0) {
      console.log(`💰 COD order payment recorded: ${order._id} - Amount: ₹${order.totalAmount}`)
      
      // Return updated order with payment details
      const updatedOrder = await Order.findById(id).lean()
      
      sendSuccess(res, {
        success: true,
        message: 'COD payment marked as collected successfully',
        data: {
          orderId: updatedOrder._id,
          orderNumber: updatedOrder._id.toString().slice(-8).toUpperCase(),
          amountPaid: updatedOrder.amountPaid,
          totalAmount: updatedOrder.totalAmount,
          paymentStatus: updatedOrder.paymentStatus,
          paymentDate: updatedOrder.paymentDate,
          notes: updatedOrder.notes,
          collectionMethod
        }
      })
    } else {
      sendError(res, 'Failed to update order payment status', 500)
    }
    
  } catch (error) {
    console.error('❌ Enhanced COD payment marking error:', error)
    sendError(res, error.message || 'Failed to mark COD order as paid', 500)
  }
})

/**
 * Export payment reports as CSV
 * GET /api/admin/orders/payment-reports/csv
 */
export const exportPaymentReports = catchAsync(async (req, res) => {
  try {
    const { 
      status, 
      paymentStatus, 
      paymentMethod,
      startDate, 
      endDate 
    } = req.query
    
    // Build date range query
    const dateQuery = {}
    if (startDate || endDate) {
      dateQuery.createdAt = {}
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate)
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate)
    }
    
    // Add other filters
    const query = { ...dateQuery }
    if (status) query.status = status
    if (paymentStatus) query.paymentStatus = paymentStatus
    if (paymentMethod) query.paymentMethod = paymentMethod
    
    // Fetch all matching orders
    const orders = await Order.find(query)
      .populate('userId', 'name email mobile')
      .sort({ createdAt: -1 })
      .lean()
    
    // Generate CSV data
    const csvHeaders = [
      'Order ID',
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Customer Mobile',
      'Payment Method',
      'Payment Status',
      'Amount Paid',
      'Total Amount',
      'Payment Date',
      'Transaction ID',
      'Order Status',
      'Created Date'
    ]
    
    const csvData = orders.map(order => {
      const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()
      
      return [
        order._id.toString(),
        order._id.toString().slice(-8).toUpperCase(),
        customerName,
        order.customer?.email || '',
        order.customer?.mobile || '',
        order.paymentMethod || 'N/A',
        order.paymentStatus || 'N/A',
        order.amountPaid || 0,
        order.totalAmount || 0,
        order.paymentDate ? new Date(order.paymentDate).toISOString() : 'N/A',
        order.razorpayPaymentId || order.razorpayOrderId || 'N/A',
        order.status || 'N/A',
        order.createdAt ? new Date(order.createdAt).toISOString() : 'N/A'
      ]
    })
    
    // Convert to CSV string
    const csvString = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=payment-reports-${new Date().toISOString().split('T')[0]}.csv`)
    
    console.log('📊 Payment reports exported:', {
      totalOrders: orders.length,
      dateRange: { startDate, endDate },
      filters: { status, paymentStatus, paymentMethod }
    })
    
    res.send(csvString)
    
  } catch (error) {
    console.error('❌ Payment reports export error:', error)
    sendError(res, error.message || 'Failed to export payment reports', 500)
  }
})

export default {
  getAllOrdersEnhanced,
  getOrderDetailsEnhanced,
  markCODOrderAsPaidEnhanced,
  exportPaymentReports
}
