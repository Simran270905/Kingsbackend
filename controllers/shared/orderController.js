import Order from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'
import { validateOrder } from '../../utils/validation.js'
import shiprocketService from '../../services/shiprocketService.js'
import { processOrderDiscount } from '../../middleware/paymentDiscount.js'
import { processOrderPayment } from '../../utils/discountCalculator.js'

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

  // Process payment plan and discount calculations
  const processedOrderData = processOrderPayment(orderData)
  console.log('📦 Processed order data with payment calculations:', processedOrderData)

  // Validate order data
  const validation = validateOrder(processedOrderData)
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
    originalAmount,
    discountApplied,
    discountPercent,
    discountedTotal,
    paymentPlan = 'full',
    advancePercent,
    advanceAmount,
    remainingPercent,
    remainingAmount,
    paymentMethodDiscount,
    codCharge = 0, // ✅ NEW: Add COD charge
    notes
  } = processedOrderData

  // Validate required fields
  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Order must contain at least one item', 400)
  }

  if (!shippingAddress) {
    return sendError(res, 'Shipping address is required', 400)
  }

  // ✅ NEW: Validate COD charge and discount logic
  // Validate COD charge
  if (paymentMethod === 'cod' && codCharge !== 150) {
    return sendError(res, 'COD orders must have exactly ₹150 handling charge', 400)
  }
  if (paymentMethod !== 'cod' && codCharge !== 0) {
    return sendError(res, 'Non-COD orders cannot have COD charge', 400)
  }
  
  // Validate discount logic
  if (discountApplied && (paymentMethod !== 'upi' && paymentMethod !== 'netbanking' && paymentMethod !== 'card' && paymentPlan !== 'full')) {
    return sendError(res, 'Discount only applies to UPI/Netbanking/Card with Full Payment', 400)
  }

  if (!totalAmount || totalAmount < 0) {
    return sendError(res, 'Valid total amount is required', 400)
  }

  // Get user ID if authenticated
  const userId = req.user?.userId || null

  // Transform items to match schema and calculate profit
  const transformedItems = items.map(item => {
    const sellingPrice = item.price // This is the discounted price customer pays
    const purchasePrice = item.purchasePrice || 0 // Cost price (internal)
    const profitPerUnit = sellingPrice - purchasePrice
    const subtotal = item.subtotal || (sellingPrice * item.quantity)
    const totalProfit = profitPerUnit * item.quantity
    
    return {
      productId: item.id || item.productId,
      name: item.name || item.title,
      price: sellingPrice, // Store selling price (what customer pays)
      purchasePrice, // Store purchase price (cost price)
      profitPerUnit, // Store profit per unit
      totalProfit, // Store total profit for this item
      quantity: item.quantity,
      selectedSize: item.selectedSize || null,
      image: item.image || null,
      subtotal
    }
  })

  // Create order with payment details
  const order = new Order({
    userId,
    items: transformedItems,
    shippingAddress,
    subtotal: subtotal || originalAmount,
    tax,
    shippingCost,
    discount,
    couponCode,
    totalAmount: discountedTotal || totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    status: 'pending',
    amountPaid: paymentMethod === 'cod' ? 0 : (paymentPlan === 'partial' ? advanceAmount : (discountedTotal || totalAmount)),
    paymentDate: paymentMethod === 'cod' ? null : new Date(),
    notes: paymentMethod === 'cod' ? 'Cash on Delivery - Payment to be collected on delivery' : 'Order created successfully',
    // Payment method discount fields (keeping for backward compatibility)
    originalAmount,
    discountedAmount: discountedTotal,
    discountType: paymentMethodDiscount > 0 ? 'payment_method' : (discount > 0 ? 'coupon' : null),
    paymentMethodDiscount,
    paymentMethodDiscountPercentage: discountPercent,
    // New payment plan fields with 10/90 split
    paymentPlan,
    discountApplied,
    discountPercent,
    discountedTotal,
    advancePercent,
    advanceAmount: paymentPlan === 'partial' ? advanceAmount : null,
    remainingPercent,
    remainingAmount: paymentPlan === 'partial' ? remainingAmount : null,
    remainingPaymentStatus: paymentPlan === 'partial' ? 'pending' : null,
    // ✅ NEW: Add COD charge field
    codCharge
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

  // Create shipment with Shiprocket
  try {
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
  } catch (error) {
    console.error('❌ Shiprocket integration error:', error.message)
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

// GET order tracking information (public endpoint)
export const trackOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  if (!orderId) {
    return sendError(res, 'Order ID is required', 400)
  }
  
  // Find order by ID - only return safe public fields
  const order = await Order.findById(orderId).select({
    status: 1,
    updatedAt: 1,
    shippingAddress: 1,
    items: 1,
    totalAmount: 1,
    paymentMethod: 1,
    trackingNumber: 1,
    trackingUrl: 1,
    estimatedDelivery: 1,
    createdAt: 1
  })
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  console.log(`📍 Order tracking requested: ${orderId} | Status: ${order.status}`)
  
  // Return only safe tracking information
  sendSuccess(res, {
    orderId: order._id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingAddress: order.shippingAddress,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      image: item.image
    })),
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery
  })
})

// GET remaining payment details for an order
export const getRemainingPayment = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  if (!orderId) {
    return sendError(res, 'Order ID is required', 400)
  }
  
  const order = await Order.findById(orderId).select({
    paymentPlan: 1,
    advanceAmount: 1,
    remainingAmount: 1,
    remainingPaymentStatus: 1,
    remainingPaymentDate: 1,
    totalAmount: 1,
    status: 1,
    paymentMethod: 1
  })
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  // Only return remaining payment info for partial payment orders
  if (order.paymentPlan !== 'partial') {
    return sendError(res, 'This order does not have a partial payment plan', 400)
  }
  
  sendSuccess(res, {
    orderId: order._id,
    paymentPlan: order.paymentPlan,
    advanceAmount: order.advanceAmount,
    remainingAmount: order.remainingAmount,
    remainingPaymentStatus: order.remainingPaymentStatus,
    remainingPaymentDate: order.remainingPaymentDate,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod
  })
})

// PATCH mark remaining payment as received
export const markRemainingPaymentAsPaid = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  if (!orderId) {
    return sendError(res, 'Order ID is required', 400)
  }
  
  const order = await Order.findById(orderId)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }
  
  // Check if order has partial payment plan
  if (order.paymentPlan !== 'partial') {
    return sendError(res, 'This order does not have a partial payment plan', 400)
  }
  
  // Check if remaining payment is already paid
  if (order.remainingPaymentStatus === 'paid') {
    return sendError(res, 'Remaining payment has already been marked as paid', 400)
  }
  
  // Update remaining payment status
  order.remainingPaymentStatus = 'paid'
  order.remainingPaymentDate = new Date()
  
  // Update overall payment status to fully paid
  order.paymentStatus = 'paid'
  order.amountPaid = order.totalAmount
  order.paymentDate = new Date()
  
  await order.save()
  
  console.log(`💰 Remaining payment marked as paid for order: ${orderId}`)
  
  sendSuccess(res, {
    orderId: order._id,
    remainingPaymentStatus: order.remainingPaymentStatus,
    remainingPaymentDate: order.remainingPaymentDate,
    paymentStatus: order.paymentStatus,
    message: 'Remaining payment marked as paid successfully'
  })
})
