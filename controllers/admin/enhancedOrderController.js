import Order, { default as OrderDefault } from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

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
    
    // Fetch orders with payment details and customer information
    // FIXED: Remove any userId filtering to get ALL orders for admin
    const orders = await Order.find(query)
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
    
    // Transform orders to include customer details and shiprocket ID
    const transformedOrders = orders.map(order => {
      // Get customer information from guestInfo (primary for guest checkout)
      let customerInfo = {}
      
      if (order.customer && (order.customer.name || order.customer.firstName || order.customer.email)) {
        // Customer object (primary for registered users)
        customerInfo = {
          name: order.customer.name || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Guest User',
          email: order.customer.email || 'N/A',
          phone: order.customer.phone || order.customer.mobile || 'N/A',
          address: order.shippingAddress || {}
        }
      } else if (order.guestInfo) {
        // Guest checkout - use guestInfo (fallback)
        customerInfo = {
          name: `${order.guestInfo.firstName || ''} ${order.guestInfo.lastName || ''}`.trim() || 'Guest User',
          email: order.guestInfo.email || 'N/A',
          phone: order.guestInfo.mobile || 'N/A',
          address: {
            streetAddress: order.guestInfo.streetAddress || 'N/A',
            city: order.guestInfo.city || 'N/A',
            state: order.guestInfo.state || 'N/A',
            zipCode: order.guestInfo.zipCode || 'N/A'
          }
        }
      } else if (order.userId) {
        // Orders with userId field (legacy)
        customerInfo = {
          name: order.userId?.name || 'N/A',
          email: order.userId?.email || 'N/A',
          phone: order.userId?.mobile || 'N/A',
          address: order.shippingAddress || {}
        }
      } else {
        // Fallback - try to extract from any available fields
        customerInfo = {
          name: 'Guest User',
          email: order.shippingAddress?.email || 'N/A',
          phone: order.shippingAddress?.mobile || 'N/A',
          address: order.shippingAddress || {}
        }
      }

      return {
        ...order,
        customer: customerInfo,
        shiprocketOrderId: order.shiprocketOrderId || 'N/A',
        awbCode: order.awbCode || 'N/A',
        trackingNumber: order.trackingNumber || 'N/A',
        trackingUrl: order.trackingUrl || 'N/A',
        courierName: order.courierName || 'N/A'
      }
    })

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
      orders: transformedOrders,
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
      .populate('paymentId', 'razorpayOrderId razorpayPaymentId status amount')
      .populate('items.productId', 'name price images')
      .lean()
    
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }

    // Ensure each order item has image - use product image if item doesn't have one
    const orderWithImages = {
      ...order,
      items: order.items.map(item => {
        // If item has image, use it; otherwise use product's first image
        const itemImage = item.image || 
                         (item.productId?.images?.length > 0 ? item.productId.images[0] : null)
        
        return {
          ...item,
          image: itemImage
        }
      })
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
    
    sendSuccess(res, {
      success: true,
      data: {
        order: orderWithImages,
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
    console.error('Mark COD as paid error:', error)
    sendError(res, error.message || 'Failed to mark COD order as paid', 500)
  }
})

/**
 * Create shipment for an order using Shiprocket
 * POST /api/admin/orders/:id/create-shipment
 */
export const createOrderShipment = catchAsync(async (req, res) => {
  try {
    const { id } = req.params

    // Find the order
    const order = await Order.findById(id)
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }

    // Validation: Only allow shipment if order is paid
    if (order.paymentStatus !== 'paid') {
      return sendError(res, 'Shipment can only be created for paid orders', 400)
    }

    // Validation: Check if shipment already created (allow retry for failed shipments)
    if (order.shippingStatus && order.shippingStatus !== 'not_created' && order.shippingStatus !== 'failed') {
      return sendError(res, 'Shipment already created for this order', 400)
    }

    // Import shiprocket service
    const shiprocketService = (await import('../../services/shiprocketService.js')).default

    // Create shipment
    const shipmentResult = await shiprocketService.createOrder({
      _id: order._id,
      shippingAddress: order.guestInfo || order.shippingAddress,
      items: order.items,
      paymentMethod: order.paymentMethod,
      shippingCost: order.shippingCost,
      discount: order.discount,
      subtotal: order.subtotal,
      totalAmount: order.totalAmount,
      notes: order.notes
    })

    if (shipmentResult.status === 'failed') {
      return sendError(res, shipmentResult.error || 'Failed to create shipment', 500)
    }

    // Update order with shipment details
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        shipmentId: shipmentResult.shipmentId,
        shiprocketOrderId: shipmentResult.shipmentId,
        trackingUrl: shipmentResult.trackingUrl,
        courierName: shipmentResult.courierName,
        shippingStatus: 'created',
        estimatedDelivery: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
      },
      { new: true }
    )
    
    // Get AWB number
    const awbResult = await shiprocketService.getAWBNumber(shipmentResult.shipmentId)
    if (awbResult.success) {
      await Order.findByIdAndUpdate(
        id,
        {
          awbCode: awbResult.awbNumber
        }
      )
    }

    sendSuccess(res, {
      order: updatedOrder,
      shipment: shipmentResult,
      awbCode: awbResult.success ? awbResult.awbNumber : null
    }, 201, 'Shipment created successfully')

  } catch (error) {
    console.error('Create shipment error:', error)
    sendError(res, error.message || 'Failed to create shipment', 500)
  }
})

/**
 * Track shipment using AWB code
 * GET /api/admin/orders/:id/track-shipment
 */
export const trackOrderShipment = catchAsync(async (req, res) => {
  try {
    const { id } = req.params
    console.log('Tracking shipment for order:', id)

    // Find the order
    const order = await Order.findById(id)
    if (!order) {
      console.log('Order not found:', id)
      return sendError(res, 'Order not found', 404)
    }

    console.log('Order found:', {
      orderId: order._id,
      shipmentId: order.shipmentId,
      shiprocketOrderId: order.shiprocketOrderId,
      trackingUrl: order.trackingUrl
    })

    if (!order.shipmentId) {
      console.log('No shipment ID found for order:', id)
      return sendError(res, 'No shipment found for this order', 404)
    }

    // Import shiprocket service
    const shiprocketService = (await import('../../services/shiprocketService.js')).default

    // Get tracking information
    const trackingResult = await shiprocketService.getTracking(order.shipmentId)

    if (!trackingResult.success) {
      return sendError(res, trackingResult.error || 'Failed to track shipment', 500)
    }

    sendSuccess(res, {
      order: order,
      tracking: trackingResult.data
    }, 200, 'Tracking information retrieved successfully')

  } catch (error) {
    console.error('Track shipment error:', error)
    sendError(res, error.message || 'Failed to track shipment', 500)
  }
})

