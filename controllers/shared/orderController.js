import Order from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'
import { validateOrder } from '../../utils/validation.js'
import shiprocketService from '../../services/shiprocketService.js'

// GET all orders (Admin only)
export const getOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query

  let query = {}
  if (status && status !== 'all') {
    query.status = status
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const orders = await Order.find(query)
    .populate('userId', 'name email mobile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  const total = await Order.countDocuments(query)

  console.log(`📋 Fetched ${orders.length} orders for admin (page ${page})`)

  sendSuccess(res, {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

// GET single order by ID
export const getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email mobile')
    .populate('items.productId', 'name price images')

  if (!order) {
    return sendError(res, 'Order not found', 404)
  }

  // Get tracking information if shipment exists
  let trackingInfo = null
  if (order.shipmentId && order.shippingStatus === 'created') {
    try {
      trackingInfo = await shiprocketService.getTracking(order.shipmentId)
    } catch (error) {
      console.log('Tracking info not available:', error.message)
    }
  }

  const orderResponse = {
    ...order.toObject(),
    trackingInfo
  }

  sendSuccess(res, orderResponse)
})

// GET user's orders (Customer only)
export const getUserOrders = catchAsync(async (req, res) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendError(res, 'User not authenticated', 401)
  }

  const { status, page = 1, limit = 10 } = req.query

  let query = { userId }
  if (status && status !== 'all') {
    query.status = status
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const orders = await Order.find(query)
    .populate('userId', 'name email mobile')
    .populate('items.productId', 'name price images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  const total = await Order.countDocuments(query)

  console.log(`👤 Fetched ${orders.length} orders for user ${userId}`)

  sendSuccess(res, {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

// CREATE new order
export const createOrder = catchAsync(async (req, res) => {
  console.log('📦 Creating new order:', req.body)

  const orderData = req.body

  // Validate order data
  const validation = validateOrder(orderData)
  if (!validation.valid) {
    return sendError(res, 'Validation failed', 400, validation.errors)
  }

  const {
    items,
    shippingAddress,
    subtotal,
    tax = 0,
    shippingCost = 0,
    discount = 0,
    couponCode = null,
    totalAmount,
    paymentMethod = 'cod',
    notes
  } = req.body

  // Validate required fields
  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Order must contain at least one item', 400)
  }

  if (!shippingAddress) {
    return sendError(res, 'Shipping address is required', 400)
  }

  if (!totalAmount || totalAmount < 0) {
    return sendError(res, 'Valid total amount is required', 400)
  }

  // Get user ID if authenticated (optional for guest checkout)
  const userId = req.body.user || req.user?.userId || null

  // Transform items to match schema
  const transformedItems = items.map(item => ({
    productId: item.id || item.productId,
    name: item.name || item.title,
    price: item.price,
    quantity: item.quantity,
    selectedSize: item.selectedSize || null,
    image: item.image || null,
    subtotal: item.subtotal || (item.price * item.quantity)
  }))

  // Create order with payment details
  const order = new Order({
    userId,
    items: transformedItems,
    shippingAddress,
    subtotal: subtotal || totalAmount,
    tax,
    shippingCost,
    discount,
    couponCode,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    status: 'pending',
    amountPaid: paymentMethod === 'cod' ? 0 : totalAmount, // COD orders start with 0 paid
    paymentDate: paymentMethod === 'cod' ? null : new Date(), // COD orders have no payment date initially
    notes: paymentMethod === 'cod' ? 'Cash on Delivery - Payment to be collected on delivery' : 'Order created successfully'
  })

  await order.save()
  
  console.log(`📦 Order created: ${order._id} | Method: ${paymentMethod} | Payment Status: ${order.paymentStatus} | Amount: ₹${totalAmount}`)

  // Increment coupon usage if coupon was applied
  if (couponCode && discount > 0) {
    try {
      const { incrementCouponUsage } = await import('./couponController.js')
      await incrementCouponUsage(couponCode, userId)
      console.log('✅ Coupon usage incremented for:', couponCode)
    } catch (error) {
      console.error('❌ Error incrementing coupon usage:', error)
      // Don't fail the order creation for coupon increment errors
    }
  }

  // Populate user data for response
  await order.populate('userId', 'name email mobile')

  // Create shipment with Shiprocket (TEMPORARILY DISABLED)
  try {
    console.log('🚀 Shiprocket integration temporarily disabled - fix credentials in .env')
    console.log('📝 See SHIPROCKET_FIX_GUIDE.md for instructions')
    
    // TODO: Re-enable after fixing Shiprocket credentials
    /*
    console.log('🚀 Creating shipment with Shiprocket for order:', order._id)
    const shipmentResult = await shiprocketService.createOrder(order)

    if (shipmentResult.status === 'created') {
      order.shipmentId = shipmentResult.shipmentId
      order.trackingUrl = shipmentResult.trackingUrl
      order.shippingStatus = 'created'
      order.trackingNumber = shipmentResult.shipmentId.toString()
      await order.save()
      console.log('✅ Shipment created successfully:', shipmentResult.shipmentId)
    } else {
      order.shippingStatus = 'failed'
      await order.save()
      console.log('❌ Shipment creation failed, marked as pending')
    }
    */
    
    // Set status to pending (manual shipping)
    order.shippingStatus = 'pending'
    order.notes = order.notes + ' [Shiprocket integration disabled - manual shipping required]'
    await order.save()
    console.log('📦 Order created - manual shipping required')
    
  } catch (error) {
    console.error('❌ Shiprocket setup error:', error.message)
    order.shippingStatus = 'failed'
    await order.save()
  }

  console.log('✅ Order created successfully:', order._id)

  sendSuccess(res, order, 201, 'Order created successfully')
})

// UPDATE order status
export const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
  
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, `Status must be one of: ${validStatuses.join(', ')}`, 400)
  }
  
  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  sendSuccess(res, order, 200, 'Order status updated successfully')
})

// UPDATE order details
export const updateOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  
  // Don't allow changing items or total directly
  delete updates.items
  delete updates.total
  
  const order = await Order.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  )
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  sendSuccess(res, order, 200, 'Order updated successfully')
})

// DELETE order
export const deleteOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  
  const order = await Order.findByIdAndDelete(id)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  sendSuccess(res, null, 200, 'Order deleted successfully')
})

// GET order statistics
export const getOrderStats = catchAsync(async (req, res) => {
  console.log('📊 Fetching order statistics...')
  
  const stats = {
    total: await Order.countDocuments(),
    pending: await Order.countDocuments({ status: 'pending' }),
    confirmed: await Order.countDocuments({ status: 'confirmed' }),
    processing: await Order.countDocuments({ status: 'processing' }),
    shipped: await Order.countDocuments({ status: 'shipped' }),
    delivered: await Order.countDocuments({ status: 'delivered' }),
    cancelled: await Order.countDocuments({ status: 'cancelled' })
  }
  
  // Revenue from PAID orders only
  const revenue = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
  ])
  
  stats.revenue = revenue[0]?.totalRevenue || 0
  
  // Additional payment status stats
  stats.paymentStatus = {
    pending: await Order.countDocuments({ paymentStatus: 'pending' }),
    paid: await Order.countDocuments({ paymentStatus: 'paid' }),
    failed: await Order.countDocuments({ paymentStatus: 'failed' }),
    refunded: await Order.countDocuments({ paymentStatus: 'refunded' })
  }
  
  console.log(`✅ Order stats - Total: ${stats.total}, Revenue: ₹${stats.revenue}, Paid: ${stats.paymentStatus.paid}`)
  
  sendSuccess(res, stats)
})
