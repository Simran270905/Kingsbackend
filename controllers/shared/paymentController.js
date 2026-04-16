import Razorpay from 'razorpay'
import crypto from 'crypto'
import Payment from '../../models/Payment.js'
import Order from '../models/Order.js'
import Cart from '../../models/Cart.js'
import shiprocketService from '../../services/shiprocketService.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// Initialize Razorpay instance with lazy loading
let razorpay = null

const getRazorpayInstance = () => {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
    
    console.log('🔑 Razorpay Debug:')
    console.log('Key ID exists:', !!keyId)
    console.log('Key Secret exists:', !!keySecret)
    console.log('Key ID starts with rzp_live_:', keyId?.startsWith('rzp_live_'))
    console.log('Key ID length:', keyId?.length)
    
    if (!keyId || !keySecret) {
      console.error('❌ Razorpay credentials missing')
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured. Please set them in environment variables.')
    }
    
    console.log('🔧 Creating Razorpay instance...')
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
    console.log('✅ Razorpay instance created successfully')
  }
  return razorpay
}

// Create Razorpay Order - Simplified
export const createRazorpayOrder = catchAsync(async (req, res) => {
  try {
    console.log('=== CREATING RAZORPAY ORDER ===')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    console.log('Request headers:', req.headers)
    
    const { amount, totalAmount } = req.body
    
    // DEBUG: Log incoming amount
    console.log("Incoming amount:", amount || totalAmount)
    
    // Use totalAmount if amount is not provided
    const finalAmount = amount || totalAmount
    
    if (!finalAmount) {
      return res.status(400).json({ message: "Amount required" })
    }
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" })
    }
    
    // Minimum amount validation (₹1.00 minimum for Razorpay)
    if (finalAmount < 1) {
      return res.status(400).json({ 
        message: "Minimum order amount is ₹1.00",
        currentAmount: finalAmount,
        minimumAmount: 1.00
      })
    }
    
    console.log('Getting Razorpay instance...')
    const razorpayInstance = getRazorpayInstance()
    
    const order = await razorpayInstance.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      receipt: "receipt_" + Date.now()
    })
    
    console.log('Razorpay order created:', order.id)
    res.json(order)
  } catch (error) {
    console.error("RAZORPAY ERROR:", error)
    res.status(500).json({ message: error.message })
  }
})

// Verify Payment and Create Order
export const verifyPaymentAndCreateOrder = catchAsync(async (req, res) => {
  console.log(' PROCESSING PAYMENT VERIFICATION AND ORDER CREATION...')
  console.log(' Request body:', JSON.stringify(req.body, null, 2))
  console.log(' Request headers:', req.headers)
  
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    cartItems,
    customer,
    totalAmount,
    orderData,
    // Support both field name formats
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body
  
  // Use whichever field name format is provided
  const finalOrderId = razorpayOrderId || razorpay_order_id
  const finalPaymentId = razorpayPaymentId || razorpay_payment_id
  const finalSignature = razorpaySignature || razorpay_signature
  
  // Payment methods that require full payment only
  const fullPaymentOnlyMethods = ['upi', 'netbanking', 'card']
  // COD supports both payment plans (partial and full)
  
  // Validate payment method and plan combination
  if (orderData && orderData.paymentMethod && orderData.paymentPlan) {
    const paymentMethod = orderData.paymentMethod.toLowerCase()
    if (fullPaymentOnlyMethods.includes(paymentMethod) && orderData.paymentPlan === 'partial') {
      console.log('Partial payment not allowed for payment method:', orderData.paymentMethod)
      return sendError(res, `Partial payment is not allowed for ${orderData.paymentMethod}. Please select full payment.`, 400)
    }
    // Removed restriction for COD - now supports both full and partial payment
  }
  
  // Validation
  console.log(' Validating payment credentials:')
  console.log('- finalOrderId:', finalOrderId)
  console.log('- finalPaymentId:', finalPaymentId)
  console.log('- finalSignature:', finalSignature ? 'Present' : 'Missing')
  console.log('- customer:', customer ? 'Present' : 'Missing')
  console.log('- cartItems:', cartItems ? `${cartItems.length} items` : 'Missing')
  console.log('- totalAmount:', totalAmount)
  
  if (!finalOrderId || !finalPaymentId || !finalSignature) {
    console.log(' Missing payment credentials')
    return sendError(res, 'Payment credentials are required', 400)
  }
  
  if (!customer || !cartItems || !totalAmount) {
    console.log('❌ Missing order details')
    return sendError(res, 'Order details are required', 400)
  }
  
  try {
    console.log(` Verifying payment signature for order: ${finalOrderId}`)
    console.log(' Razorpay Secret available:', !!process.env.RAZORPAY_KEY_SECRET)
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    hmac.update(finalOrderId + '|' + finalPaymentId)
    const generated_signature = hmac.digest('hex')
    
    console.log(' Generated signature:', generated_signature)
    console.log(' Received signature:', finalSignature)
    console.log(' Signatures match:', generated_signature === finalSignature)
    
    if (generated_signature !== finalSignature) {
      console.log('❌ Payment signature verification failed')
      console.log('❌ Possible causes:')
      console.log('  - Invalid Razorpay secret')
      console.log('  - Tampered payment data')
      console.log('  - Network interference')
      
      // Update payment as failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { 
          status: 'failed',
          errorDescription: 'Signature verification failed'
        }
      )
      
      return sendError(res, 'Payment signature verification failed. Payment not processed.', 400)
    }
    
    console.log('✅ Payment signature verified successfully')
    
    // Fetch payment details from Razorpay to verify
    console.log(' Fetching payment details from Razorpay...')
    
    // For test payments, bypass the Razorpay fetch
    console.log(' Checking payment ID:', finalPaymentId)
    console.log(' Payment ID starts with pay_test_:', finalPaymentId.startsWith('pay_test_'))
    if (finalPaymentId.startsWith('pay_test_')) {
      console.log(' Test payment detected, bypassing Razorpay fetch')
      var paymentDetails = {
        id: finalPaymentId,
        status: 'captured',
        amount: totalAmount * 100, // Convert to paise
        currency: 'INR',
        captured: true,
        method: 'test',
        created_at: Math.floor(Date.now() / 1000)
      }
    } else {
      const razorpayInstance = getRazorpayInstance()
      console.log(' Razorpay instance available:', !!razorpayInstance)
      
      if (!razorpayInstance) {
        console.log(' Razorpay instance not available')
        return sendError(res, 'Payment service not available. Please contact support.', 503)
      }
      
      var paymentDetails = await razorpayInstance.payments.fetch(finalPaymentId)
      console.log(' Razorpay payment details:', {
        id: paymentDetails.id,
        status: paymentDetails.status,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        captured: paymentDetails.captured,
        method: paymentDetails.method,
        created_at: paymentDetails.created_at
      })
      
      if (paymentDetails.status !== 'captured') {
        console.log(` Payment not captured. Status: ${paymentDetails.status}`)
        console.log(' Possible causes:')
        console.log('  - Payment failed at Razorpay')
        console.log('  - Payment was cancelled')
        console.log('  - Invalid payment ID')
        return sendError(res, `Payment was not captured by Razorpay. Status: ${paymentDetails.status}`, 400)
      }
    }
    
    console.log(` Payment captured successfully. Amount: ${paymentDetails.amount / 100}`)
    console.log(' Detailed Payment Info:')
    console.log('- Razorpay Order ID:', paymentDetails.id)
    console.log('- Payment ID:', paymentDetails.razorpay_payment_id || finalPaymentId)
    console.log('- Payment Method:', paymentDetails.method)
    console.log('- Payment Type:', paymentDetails.captured ? 'Captured' : 'Authorized')
    console.log('- Payment Currency:', paymentDetails.currency)
    console.log('- Created At:', paymentDetails.created_at)
    
    // Transform cart items to match order schema
    console.log('🛒 Creating order with transformed items...')
    const transformedItems = cartItems.map(item => ({
      productId: item.id || item.productId,
      name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize || null,
      image: item.image || null,
      subtotal: item.subtotal || (item.price * item.quantity)
    }))
    
    console.log('📦 Transformed items:', transformedItems.length, 'items')
    
    // Create order with correct field names
    const orderPayload = {
      // Guest checkout - no userId required
      items: transformedItems,
      // Explicitly set customer to null for guest checkout
      customer: null,
      // For guest checkout, use guestInfo instead of customer
      guestInfo: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        mobile: customer.mobile,
        streetAddress: customer.streetAddress,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode
      },
      shippingAddress: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        mobile: customer.mobile,
        streetAddress: customer.streetAddress,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode
      },
      subtotal: totalAmount, // Will be calculated properly if needed
      tax: 0,
      shippingCost: 0,
      discount: 0,
      couponCode: null,
      totalAmount: totalAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      status: 'confirmed', // Auto-confirm after payment success
      razorpayOrderId: finalOrderId,
      razorpayPaymentId: finalPaymentId,
      razorpaySignature: finalSignature,
      paidAt: new Date(), // Set paid timestamp
      amountPaid: totalAmount, // Full amount paid for online payments
      paymentDate: new Date(), // Set payment date
      notes: 'Payment successful via Razorpay. Transaction ID: ' + finalPaymentId,
      // Store comprehensive payment details
      paymentDetails: {
        razorpayOrderId: paymentDetails.id,
        razorpayPaymentId: paymentDetails.razorpay_payment_id,
        razorpaySignature: paymentDetails.razorpay_signature,
        razorpayOrderCreationId: paymentDetails.order_id,
        razorpayAmount: paymentDetails.amount / 100, // Convert from paise to rupees
        razorpayCurrency: paymentDetails.currency,
        razorpayMethod: paymentDetails.method,
        razorpayStatus: paymentDetails.status,
        razorpayCaptured: paymentDetails.captured,
        razorpayCreatedAt: paymentDetails.created_at,
        razorpayBank: paymentDetails.bank || null,
        razorpayWallet: paymentDetails.wallet || null,
        razorpayVPA: paymentDetails.vpa || null,
        razorpayEmail: paymentDetails.email || null,
        razorpayContact: paymentDetails.contact || null,
        razorpayFee: paymentDetails.fee || null,
        razorpayTax: paymentDetails.tax || null,
        razorpayDescription: paymentDetails.description || null,
        razorpayCardId: paymentDetails.card_id || null,
        razorpayInternational: paymentDetails.international || false,
        razorpayEmi: paymentDetails.emi || null,
        razorpayRetryCount: paymentDetails.retry_count || 0,
        razorpayFailureReason: paymentDetails.failure_reason || null,
        razorpayAcquirer: paymentDetails.acquirer_data?.bank || paymentDetails.acquirer_data?.wallet || null,
        razorpayErrorDescription: paymentDetails.error_description || null,
        razorpayErrorSource: paymentDetails.error_source || null,
        razorpayErrorCode: paymentDetails.error_code || null,
        razorpayRefundStatus: paymentDetails.refund_status || null,
        razorpaySpeed: paymentDetails.speed || null,
        razorpayUmeVerification: paymentDetails.verification || false,
        razorpayOffer: paymentDetails.offer || null,
        razorpayExpiry: paymentDetails.expiry || null,
        razorpayNotes: paymentDetails.notes || null,
        razorpayMerchant: paymentDetails.merchant || null,
        razorpaySettlement: paymentDetails.settlement || null,
        razorpayQrCode: paymentDetails.qr_code || null,
        razorpayUpiLink: paymentDetails.upi_link || null,
        razorpayVirtualAddress: paymentDetails.virtual_address || null,
        razorpayCustomer: paymentDetails.customer || null,
        razorpayRecurring: paymentDetails.recurring || false,
        razorpayType: paymentDetails.type || null,
        orderData: {
          paymentPlan: 'full',
          advancePaid: 0,
          remainingAmount: 0,
          remainingPaymentStatus: 'pending',
          originalAmount: totalAmount,
          discountedAmount: 0,
          discountType: 'none',
          discountPercent: 0,
          discountApplied: false
        }
      }
    }
    
    console.log('Creating order with data:', JSON.stringify(orderPayload, null, 2))
    const order = new Order(orderPayload)
    
    try {
      await order.save()
      console.log(` Order created successfully: ${order._id}`)
      console.log(' Order details:', {
        id: order._id,
        itemsCount: order.items.length,
        totalAmount: order.totalAmount,
        customerEmail: customer.email,
        paymentMethod: order.paymentMethod
      })
    } catch (orderError) {
      console.error(' Order creation failed:', orderError)
      throw orderError
    }
    
    // Create shipment with Shiprocket (async, don't block order creation)
    console.log(' Calling createShipment for order:', order._id)
    createShipment(order).catch(error => {
      console.error('Shipment creation failed:', error)
      // Don't fail the order if shipment creation fails
    })
    
    // Create or update payment record with orderId
    let payment = await Payment.findOne({ razorpayOrderId: finalOrderId })
    
    if (!payment) {
      // Create payment record for guest checkout
      payment = new Payment({
        razorpayOrderId: finalOrderId,
        razorpayPaymentId: finalPaymentId,
        razorpaySignature: finalSignature,
        amount: totalAmount,
        currency: 'INR',
        status: 'captured',
        paymentMethod: 'razorpay',
        orderId: order._id,
        customerEmail: customer.email,
        customerPhone: customer.mobile,
        isSignatureVerified: true,
        verifiedAt: new Date()
      })
      await payment.save()
      console.log(`Created new payment record: ${payment._id}`)
    } else {
      // Update existing payment record
      payment.orderId = order._id
      payment.razorpayPaymentId = finalPaymentId
      payment.razorpaySignature = finalSignature
      payment.status = 'captured'
      payment.isSignatureVerified = true
      payment.verifiedAt = new Date()
      payment.customerEmail = customer.email
      payment.customerPhone = customer.mobile
      await payment.save()
      console.log(`Updated existing payment record: ${payment._id}`)
    }
    
    // Update order with paymentId
    order.paymentId = payment._id
    await order.save()
    
    console.log(`💳 Payment record updated: ${payment._id}`)
    
    // Guest checkout - no cart clearing (no user session)
    
    console.log(' SENDING SUCCESS RESPONSE WITH ORDER ID:', order._id)
    
    // Emit real-time event for admin panel
    req.app.get('io')?.emit('order-created', {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: {
        email: order.guestInfo?.email || order.customer?.email,
        name: order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Guest Customer'
      },
      createdAt: order.createdAt
    })
    
    sendSuccess(res, {
      order: {
        _id: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: payment._id,
        createdAt: order.createdAt
      },
      message: 'Payment successful. Your order has been placed.'
    }, 201, 'Order created successfully')
  } catch (error) {
    console.error('❌ Payment verification error:', error)
    // Check if it's a Razorpay credentials error
    if (error.message && error.message.includes('Razorpay credentials')) {
      return sendError(res, 'Payment gateway is not configured. Please contact support.', 503)
    }
    sendError(res, error.message || 'Payment verification failed', 500)
  }
})

// Get payment status
export const getPaymentStatus = catchAsync(async (req, res) => {
  const { paymentId } = req.params
  
  const payment = await Payment.findById(paymentId)
  
  if (!payment) {
    return sendError(res, 'Payment not found', 404)
  }
  
  sendSuccess(res, payment)
})

// Handle payment webhook (for future use with Razorpay webhooks)
export const handlePaymentWebhook = catchAsync(async (req, res) => {
  const { event, payload } = req.body
  
  try {
    // Verify webhook signature (implement if using webhooks)
    if (event === 'payment.captured') {
      // Handle payment captured
      const paymentId = payload.payment.entity.id
      const orderId = payload.payment.entity.receipt
      
      await Payment.findOneAndUpdate(
        { razorpayPaymentId: paymentId },
        { 
          status: 'captured',
          isSignatureVerified: true,
          verifiedAt: new Date()
        }
      )
    } else if (event === 'payment.failed') {
      // Handle payment failed
      const paymentId = payload.payment.entity.id
      
      await Payment.findOneAndUpdate(
        { razorpayPaymentId: paymentId },
        { 
          status: 'failed',
          errorCode: payload.payment.entity.error_code,
          errorDescription: payload.payment.entity.error_description
        }
      )
    }
    
    sendSuccess(res, { received: true }, 200)
  } catch (error) {
    sendError(res, error.message || 'Webhook processing failed', 500)
  }
})

// Get order details for payment confirmation
export const getOrderDetails = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  try {
    const order = await Order.findById(orderId)
      .populate('paymentId', 'razorpayPaymentId status createdAt')
    
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }
    
    sendSuccess(res, { order }, 200, 'Order details retrieved successfully')
  } catch (error) {
    console.error('Error fetching order details:', error)
    sendError(res, 'Failed to fetch order details', 500)
  }
})

// Get shipment status for order
export const getShipmentStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  try {
    const order = await Order.findById(orderId)
      .select('shipmentId trackingNumber trackingUrl shippingStatus estimatedDelivery')
    
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }
    
    // If shipment exists, return shipment details
    if (order.shipmentId) {
      sendSuccess(res, {
        shipmentId: order.shipmentId,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        status: order.shippingStatus,
        estimatedDelivery: order.estimatedDelivery
      }, 200, 'Shipment status retrieved successfully')
    } else {
      // No shipment created yet
      sendSuccess(res, {
        status: 'not_created',
        message: 'Shipment will be created soon'
      }, 200, 'Shipment not yet created')
    }
  } catch (error) {
    console.error('Error fetching shipment status:', error)
    sendError(res, 'Failed to fetch shipment status', 500)
  }
})

// Create Shiprocket shipment for order
export const createShiprocketShipment = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  try {
    const order = await Order.findById(orderId)
    
    if (!order) {
      return sendError(res, 'Order not found', 404)
    }
    
    // Check if shipment already exists
    if (order.shipmentId) {
      return sendError(res, 'Shipment already created for this order', 400)
    }
    
    // Create shipment data for Shiprocket
    const shipmentData = {
      _id: order._id,
      items: order.items,
      shippingAddress: {
        ...order.customer,
        email: order.customer.email
      },
      paymentMethod: order.paymentMethod || 'razorpay',
      subtotal: order.totalAmount,
      totalAmount: order.totalAmount,
      notes: order.notes
    }
    
    // Import shiprocket service
    const shiprocketService = (await import('../../services/shiprocketService.js')).default
    
    const shipmentResult = await shiprocketService.createOrder(shipmentData)
    
    if (shipmentResult.status === 'created') {
      // Update order with shipment details
      await Order.findByIdAndUpdate(orderId, {
        shipmentId: shipmentResult.shipmentId,
        trackingUrl: shipmentResult.trackingUrl,
        shippingStatus: 'created',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      })
      
      // Try to get AWB number
      try {
        const awbResult = await shiprocketService.getAWBNumber(shipmentResult.shipmentId)
        if (awbResult.success) {
          await Order.findByIdAndUpdate(orderId, {
            trackingNumber: awbResult.awbNumber
          })
        }
      } catch (awbError) {
        console.log('AWB number retrieval failed (will retry later):', awbError.message)
      }
      
      sendSuccess(res, {
        shipmentId: shipmentResult.shipmentId,
        trackingUrl: shipmentResult.trackingUrl,
        trackingNumber: shipmentResult.awbNumber || null,
        status: 'created',
        message: 'Shipment created successfully on Shiprocket'
      }, 201, 'Shipment created successfully')
    } else {
      // Update order with failed status
      await Order.findByIdAndUpdate(orderId, {
        shippingStatus: 'failed',
        notes: `Shipment failed: ${shipmentResult.error}`
      })
      
      sendError(res, `Shipment creation failed: ${shipmentResult.error}`, 400)
    }
  } catch (error) {
    console.error('Error creating Shiprocket shipment:', error)
    
    // Update order with failed status
    await Order.findByIdAndUpdate(orderId, {
      shippingStatus: 'failed',
      notes: `Shipment error: ${error.message}`
    })
    
    sendError(res, error.message || 'Failed to create shipment', 500)
  }
})

// Get payment history (guest checkout - returns all payments or filter by customer email if available)
export const getPaymentHistory = catchAsync(async (req, res) => {
  // For guest checkout, return all payments or implement customer-based filtering
  const payments = await Payment.find({})
    .populate('orderId', 'status total createdAt')
    .sort({ createdAt: -1 })
  
  sendSuccess(res, payments)
})

// Create shipment with Shiprocket
async function createShipment(order) {
  try {
    console.log('Creating shipment for order:', order._id)
    
    const shipmentData = {
      _id: order._id,
      items: order.items,
      shippingAddress: {
        ...order.guestInfo,
        email: order.guestInfo?.email || order.customer?.email,
        mobile: order.guestInfo?.mobile || order.customer?.mobile,
        streetAddress: order.guestInfo?.streetAddress || order.customer?.streetAddress,
        city: order.guestInfo?.city || order.customer?.city,
        state: order.guestInfo?.state || order.customer?.state,
        zipCode: order.guestInfo?.zipCode || order.customer?.zipCode
      },
      paymentMethod: order.paymentMethod || 'razorpay',
      subtotal: order.totalAmount,
      totalAmount: order.totalAmount,
      notes: order.notes
    }
    
    const shipmentResult = await shiprocketService.createOrder(shipmentData)
    
    if (shipmentResult.status === 'created') {
      // Update order with shipment details
      await Order.findByIdAndUpdate(order._id, {
        shipmentId: shipmentResult.shipmentId,
        trackingUrl: shipmentResult.trackingUrl,
        shippingStatus: 'created',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      })
      
      console.log('Shipment created successfully:', shipmentResult)
      
      // Try to get AWB number
      try {
        const awbResult = await shiprocketService.getAWBNumber(shipmentResult.shipmentId)
        if (awbResult.success) {
          await Order.findByIdAndUpdate(order._id, {
            trackingNumber: awbResult.awbNumber
          })
          console.log('AWB number obtained:', awbResult.awbNumber)
        }
      } catch (awbError) {
        console.log('AWB number retrieval failed (will retry later):', awbError.message)
      }
    } else {
      console.error('Shipment creation failed:', shipmentResult.error)
      // Update order with failed status
      await Order.findByIdAndUpdate(order._id, {
        shippingStatus: 'failed',
        notes: `Shipment failed: ${shipmentResult.error}`
      })
    }
  } catch (error) {
    console.error('Error in createShipment:', error)
    // Update order with failed status
    await Order.findByIdAndUpdate(order._id, {
      shippingStatus: 'failed',
      notes: `Shipment error: ${error.message}`
    })
  }
}
