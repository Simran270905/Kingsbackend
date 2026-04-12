import Razorpay from 'razorpay'
import crypto from 'crypto'
import Payment from '../../models/Payment.js'
import Order from '../../models/Order.js'
import Cart from '../../models/Cart.js'
import shiprocketService from '../../services/shiprocketService.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// Initialize Razorpay instance with lazy loading
let razorpay = null

const getRazorpayInstance = () => {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured. Please set them in environment variables.')
    }
    
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  }
  return razorpay
}

// Create Razorpay Order
export const createRazorpayOrder = catchAsync(async (req, res) => {
  console.log('=== CREATE RAZORPAY ORDER DEBUG ===')
  console.log('Request body:', req.body)
  console.log('User:', req.user)
  
  const { amount, currency = 'INR', receipt } = req.body
  
  if (!amount) {
    console.log('Amount is required')
    return sendError(res, 'Amount is required', 400)
  }
  
  try {
    console.log('Getting Razorpay instance...')
    const razorpayInstance = getRazorpayInstance()
    console.log('Razorpay instance created successfully')
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `order-${Date.now()}`,
      payment_capture: 1 // Auto capture
    }
    
    console.log('Creating order with options:', options)
    const razorpayOrder = await razorpayInstance.orders.create(options)
    console.log('Razorpay order created:', razorpayOrder)
    
    // Save payment record
    const payment = await Payment.create({
      orderId: null, // Will be set after order confirmation
      userId: req.user.userId,
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      currency,
      status: 'pending',
      customerEmail: req.user.email
    })
    
    sendSuccess(res, {
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      currency,
      paymentId: payment._id,
      key_id: process.env.RAZORPAY_KEY_ID
    }, 201, 'Razorpay order created')
  } catch (error) {
    console.error('=== CREATE RAZORPAY ORDER ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Check if it's a Razorpay credentials error
    if (error.message && error.message.includes('Razorpay credentials')) {
      console.error('Razorpay credentials error detected')
      return sendError(res, 'Payment gateway is not configured. Please contact support.', 503)
    }
    
    console.error('Sending error response to frontend')
    sendError(res, error.message || 'Failed to create Razorpay order', 500)
  }
})

// Verify Payment and Create Order
export const verifyPaymentAndCreateOrder = catchAsync(async (req, res) => {
  console.log('💳 Processing payment verification and order creation...')
  
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    cartItems,
    customer,
    totalAmount
  } = req.body
  
  // Validation
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    console.log('❌ Missing payment credentials')
    return sendError(res, 'Payment credentials are required', 400)
  }
  
  if (!customer || !cartItems || !totalAmount) {
    console.log('❌ Missing order details')
    return sendError(res, 'Order details are required', 400)
  }
  
  try {
    console.log(`🔐 Verifying payment signature for order: ${razorpayOrderId}`)
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    hmac.update(razorpayOrderId + '|' + razorpayPaymentId)
    const generated_signature = hmac.digest('hex')
    
    if (generated_signature !== razorpaySignature) {
      console.log('❌ Payment signature verification failed')
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
    const razorpayInstance = getRazorpayInstance()
    const paymentDetails = await razorpayInstance.payments.fetch(razorpayPaymentId)
    
    if (paymentDetails.status !== 'captured') {
      console.log(`❌ Payment not captured. Status: ${paymentDetails.status}`)
      return sendError(res, 'Payment was not captured by Razorpay', 400)
    }
    
    console.log(`💰 Payment captured successfully. Amount: ₹${paymentDetails.amount / 100}`)
    
    // Transform cart items to match order schema
    const transformedItems = cartItems.map(item => ({
      productId: item.id || item.productId,
      name: item.name || item.title,
      price: item.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize || null,
      image: item.image || null,
      subtotal: item.subtotal || (item.price * item.quantity)
    }))
    
    // Create order with correct field names
    const order = new Order({
      userId: req.user?.userId || null,
      items: transformedItems,
      customer: {
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
      razorpayOrderId,
      razorpayPaymentId,
      amountPaid: totalAmount, // Full amount paid for online payments
      paymentDate: new Date(), // Set payment date
      notes: `Payment successful via Razorpay. Transaction ID: ${razorpayPaymentId}`
    })
    
    await order.save()
    console.log(`✅ Order created successfully: ${order._id}`)
    
    // Create shipment with Shiprocket (async, don't block order creation)
    createShipment(order).catch(error => {
      console.error('Shipment creation failed:', error)
      // Don't fail the order if shipment creation fails
    })
    
    // Update payment record with orderId
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        orderId: order._id,
        razorpayPaymentId,
        razorpaySignature,
        status: 'captured',
        isSignatureVerified: true,
        verifiedAt: new Date(),
        customerEmail: customer.email,
        customerPhone: customer.mobile
      },
      { new: true }
    )
    
    // Update order with paymentId
    order.paymentId = payment._id
    await order.save()
    
    console.log(`💳 Payment record updated: ${payment._id}`)
    
    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId: req.user.userId },
      {
        items: [],
        itemCount: 0,
        totalPrice: 0
      }
    )
    
    console.log('🛒 Cart cleared for user:', req.user.userId)
    
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

// Get user's payment history
export const getPaymentHistory = catchAsync(async (req, res) => {
  const payments = await Payment.find({ userId: req.user.userId })
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
        ...order.customer,
        email: order.customer.email
      },
      paymentMethod: order.paymentMethod || 'razorpay',
      subtotal: order.total,
      totalAmount: order.total,
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
