import Order from '../../models/Order.js'
import Product from '../../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'
import shiprocketService from '../../services/shiprocketService.js'
import { validateOrder } from '../../utils/validation.js'
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
    // ✅ FIXED: No userId population needed - orders now have customer objects
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
    // ✅ FIXED: No userId population needed - orders now have customer objects
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

  // For guest checkout, shipping address is part of customer object
  if (!orderData.firstName && !orderData.lastName && !orderData.email && !orderData.mobile) {
    return sendError(res, 'Customer name, email and mobile are required', 400)
  }

  // STOCK MANAGEMENT: Check product availability and reserve stock
  console.log('Checking stock availability for order items...')
  const stockCheckResults = []
  
  for (const item of items) {
    const productId = item.id || item.productId
    if (!productId) {
      return sendError(res, `Invalid product ID for item: ${item.name || item.title}`, 400)
    }

    const product = await Product.findById(productId)
    if (!product) {
      return sendError(res, `Product not found: ${item.name || item.title}`, 404)
    }

    if (!product.isActive) {
      return sendError(res, `Product is not available: ${item.name || item.title}`, 400)
    }

    // Check stock based on whether product has sizes
    let availableStock = 0
    if (product.hasSizes && item.selectedSize) {
      const sizeStock = product.sizes.find(s => s.size === item.selectedSize)
      if (!sizeStock) {
        return sendError(res, `Size ${item.selectedSize} not available for product: ${item.name || item.title}`, 400)
      }
      availableStock = sizeStock.stock
    } else {
      availableStock = product.stock
    }

    if (availableStock < item.quantity) {
      return sendError(res, `Insufficient stock for ${item.name || item.title}. Available: ${availableStock}, Requested: ${item.quantity}`, 400)
    }

    stockCheckResults.push({
      productId,
      name: item.name || item.title,
      requestedQty: item.quantity,
      availableStock,
      hasSizes: product.hasSizes,
      selectedSize: item.selectedSize
    })
  }

  console.log('Stock check passed for all items:', stockCheckResults)

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

  // Get user ID if authenticated (optional for guest checkout)
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
    userId: req.user?.userId || null, // Optional - for logged-in users only
    items: transformedItems,
    // 🔥 PHASE 1: UPDATE ORDER SCHEMA - Support both user and guest
    ...(req.user?.userId ? {
      // Logged-in user
      customer: req.user.userId
    } : {
      // Guest checkout
      guestInfo: {
        firstName: orderData.firstName || '',
        lastName: orderData.lastName || '',
        email: orderData.email || '',
        mobile: orderData.mobile || '',
        streetAddress: orderData.streetAddress || '',
        city: orderData.city || '',
        state: orderData.state || '',
        zipCode: orderData.zipCode || ''
      }
    }),
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
  
  console.log(` Order created: ${order._id} | Method: ${paymentMethod} | Payment Status: ${order.paymentStatus} | Amount: ${totalAmount}`)

  // STOCK MANAGEMENT: Reduce stock for all ordered items
  console.log('Reducing stock for ordered items...')
  for (const item of stockCheckResults) {
    try {
      const updateQuery = {}
      
      if (item.hasSizes && item.selectedSize) {
        // Reduce stock for specific size
        updateQuery.$inc = { 'sizes.$[elem].stock': -item.requestedQty }
        updateQuery.$elemMatch = { 'sizes': { size: item.selectedSize } }
      } else {
        // Reduce general stock
        updateQuery.$inc = { stock: -item.requestedQty }
      }
      
      await Product.findByIdAndUpdate(item.productId, updateQuery)
      
      // Update sales count
      await Product.findByIdAndUpdate(item.productId, { $inc: { salesCount: item.requestedQty } })
      
      console.log(` Stock reduced for ${item.name}: -${item.requestedQty} units`)
    } catch (error) {
      console.error(` Failed to reduce stock for ${item.name}:`, error)
      // Continue with other items, don't fail the order
    }
  }

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

  // Skip user population for guest checkout
  // await order.populate('userId', 'name email mobile')

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
  
  // Get the current order before updating
  const currentOrder = await Order.findById(id)
  if (!currentOrder) {
    return sendError(res, 'Order not found', 404)
  }
  
  // STOCK MANAGEMENT: Restore stock if order is being cancelled
  if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
    console.log('Restoring stock for cancelled order items...')
    
    for (const item of currentOrder.items) {
      try {
        const product = await Product.findById(item.productId)
        if (!product) {
          console.error(`Product not found for stock restoration: ${item.productId}`)
          continue
        }
        
        const updateQuery = {}
        
        if (item.selectedSize && product.hasSizes) {
          // Restore stock for specific size
          updateQuery.$inc = { 'sizes.$[elem].stock': item.quantity }
          updateQuery.$elemMatch = { 'sizes': { size: item.selectedSize } }
        } else {
          // Restore general stock
          updateQuery.$inc = { stock: item.quantity }
        }
        
        await Product.findByIdAndUpdate(item.productId, updateQuery)
        
        // Update sales count (decrease)
        await Product.findByIdAndUpdate(item.productId, { $inc: { salesCount: -item.quantity } })
        
        console.log(` Stock restored for ${item.name}: +${item.quantity} units`)
      } catch (error) {
        console.error(` Failed to restore stock for ${item.name}:`, error)
        // Continue with other items
      }
    }
  }
  
  // Update the order status
  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )
  
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
  
  try {
    // Use a single aggregation query for better performance
    const statsData = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          shipped: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          paymentPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          paymentPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          paymentFailed: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] } },
          paymentRefunded: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          pending: 1,
          confirmed: 1,
          processing: 1,
          shipped: 1,
          delivered: 1,
          cancelled: 1,
          paymentStatus: {
            pending: '$paymentPending',
            paid: '$paymentPaid',
            failed: '$paymentFailed',
            refunded: '$paymentRefunded'
          },
          revenue: '$totalRevenue'
        }
      }
    ])
    
    const stats = statsData[0] || {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      paymentStatus: { pending: 0, paid: 0, failed: 0, refunded: 0 },
      revenue: 0
    }
    
    console.log(`✅ Order stats - Total: ${stats.total}, Revenue: ₹${stats.revenue}, Paid: ${stats.paymentStatus.paid}`)
    
    sendSuccess(res, stats)
  } catch (error) {
    console.error('❌ Error fetching order stats:', error.message)
    
    // Fallback to basic stats if aggregation fails
    const fallbackStats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      paymentStatus: { pending: 0, paid: 0, failed: 0, refunded: 0 },
      revenue: 0,
      error: 'Stats temporarily unavailable'
    }
    
    sendSuccess(res, fallbackStats)
  }
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
  
  // Return only safe tracking information with proper customer/guest handling
  // For guest orders, use guestInfo as shippingAddress
  const shippingAddress = order.guestInfo || {}
  
  sendSuccess(res, {
    orderId: order._id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingAddress: shippingAddress,
    items: order.items.map(item =>({
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

// Update order payment details
export const updateOrderPayment = catchAsync(async (req, res) => {
  const { id } = req.params
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    paymentStatus, 
    paymentMethod, 
    amountPaid 
  } = req.body

  if (!id) {
    return sendError(res, 'Order ID is required', 400)
  }

  const order = await Order.findById(id)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }

  // Update payment details
  if (razorpay_order_id) order.razorpayOrderId = razorpay_order_id
  if (razorpay_payment_id) order.razorpayPaymentId = razorpay_payment_id
  if (razorpay_signature) order.razorpaySignature = razorpay_signature
  if (paymentStatus) order.paymentStatus = paymentStatus
  if (paymentMethod) order.paymentMethod = paymentMethod
  if (amountPaid) order.amountPaid = amountPaid

  // Set payment date if status is paid
  if (paymentStatus === 'paid') {
    order.paymentDate = new Date()
    order.paidAt = new Date()
  }

  await order.save()

  console.log(`Payment updated for order: ${id} | Status: ${paymentStatus}`)

  sendSuccess(res, {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    amountPaid: order.amountPaid,
    message: 'Payment details updated successfully'
  })
})

// Create Shiprocket order
export const createShiprocketOrder = catchAsync(async (req, res) => {
  const { id } = req.params

  if (!id) {
    return sendError(res, 'Order ID is required', 400)
  }

  const order = await Order.findById(id)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }

  try {
    console.log('Creating Shiprocket order for:', order._id)
    
    const shipmentData = {
      order_id: order._id,
      order_date: order.createdAt,
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
      channel_id: process.env.SHIPROCKET_CHANNEL_ID,
      comment: order.notes || '',
      billing_customer_name: order.customer.firstName,
      billing_last_name: order.customer.lastName || '',
      billing_address: order.customer.streetAddress,
      billing_address_2: '',
      billing_city: order.customer.city,
      billing_pincode: order.customer.zipCode,
      billing_state: order.customer.state,
      billing_country: 'India',
      billing_email: order.customer.email,
      billing_phone: order.customer.mobile,
      shipping_is_billing: true,
      shipping_customer_name: order.customer.firstName,
      shipping_last_name: order.customer.lastName || '',
      shipping_address: order.customer.streetAddress,
      shipping_address_2: '',
      shipping_city: order.customer.city,
      shipping_pincode: order.customer.zipCode,
      shipping_state: order.customer.state,
      shipping_country: 'India',
      shipping_email: order.customer.email,
      shipping_phone: order.customer.mobile,
      order_items: order.items.map(item => ({
        name: item.name,
        sku: item.productId || item.id,
        units: item.quantity,
        selling_price: item.price,
        discount: '',
        tax: '',
        hsn: ''
      })),
      payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: order.totalAmount,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5
    }

    const shiprocketResult = await shiprocketService.createOrder(shipmentData)
    
    if (shiprocketResult.success) {
      // Update order with shipment details
      order.shipmentId = shiprocketResult.shipment_id
      order.trackingNumber = shiprocketResult.awb_code
      order.trackingUrl = shiprocketResult.tracking_url
      order.shippingStatus = 'created'
      order.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      
      await order.save()
      
      console.log('Shiprocket order created successfully:', shiprocketResult.shipment_id)
      
      sendSuccess(res, {
        shipmentId: shiprocketResult.shipment_id,
        trackingNumber: shiprocketResult.awb_code,
        trackingUrl: shiprocketResult.tracking_url,
        message: 'Shiprocket order created successfully'
      })
    } else {
      console.error('Shiprocket order creation failed:', shiprocketResult.error)
      sendError(res, shiprocketResult.error || 'Failed to create Shiprocket order', 500)
    }
  } catch (error) {
    console.error('Error creating Shiprocket order:', error)
    sendError(res, error.message || 'Failed to create Shiprocket order', 500)
  }
})

// Get shipment tracking
export const getShipmentTracking = catchAsync(async (req, res) => {
  const { id } = req.params

  if (!id) {
    return sendError(res, 'Order ID is required', 400)
  }

  const order = await Order.findById(id)
  
  if (!order) {
    return sendError(res, 'Order not found', 404)
  }

  if (!order.shipmentId) {
    return sendError(res, 'Shipment not created yet', 404)
  }

  try {
    const trackingResult = await shiprocketService.getTracking(order.shipmentId)
    
    sendSuccess(res, {
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shipmentId: order.shipmentId,
      trackingData: trackingResult,
      shippingStatus: order.shippingStatus,
      estimatedDelivery: order.estimatedDelivery
    })
  } catch (error) {
    console.error('Error getting tracking:', error)
    sendError(res, error.message || 'Failed to get tracking information', 500)
  }
})
