import Order from '../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'
import { validateOrder } from '../utils/validation.js'

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

  sendSuccess(res, order)
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

  // Get user ID if authenticated
  const userId = req.user?.userId || null

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

  // Create order
  const order = new Order({
    userId,
    items: transformedItems,
    shippingAddress,
    subtotal: subtotal || totalAmount,
    tax,
    shippingCost,
    discount,
    totalAmount,
    paymentMethod,
    notes,
    status: 'pending',
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid'
  })

  await order.save()

  // Populate user data for response
  await order.populate('userId', 'name email mobile')

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
  const stats = {
    total: await Order.countDocuments(),
    pending: await Order.countDocuments({ status: 'pending' }),
    processing: await Order.countDocuments({ status: 'processing' }),
    shipped: await Order.countDocuments({ status: 'shipped' }),
    delivered: await Order.countDocuments({ status: 'delivered' }),
    cancelled: await Order.countDocuments({ status: 'cancelled' })
  }
  
  const revenue = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
  ])
  
  stats.revenue = revenue[0]?.totalRevenue || 0
  
  sendSuccess(res, stats)
})
