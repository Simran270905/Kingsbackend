import Razorpay from 'razorpay'
import crypto from 'crypto'
import Payment from '../models/Payment.js'
import Order from '../models/Order.js'
import Cart from '../models/Cart.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// Create Razorpay Order
export const createRazorpayOrder = catchAsync(async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body
  
  if (!amount) {
    return sendError(res, 'Amount is required', 400)
  }
  
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `order-${Date.now()}`,
      payment_capture: 1 // Auto capture
    }
    
    const razorpayOrder = await razorpay.orders.create(options)
    
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
    sendError(res, error.message || 'Failed to create Razorpay order', 500)
  }
})

// Verify Payment and Create Order
export const verifyPaymentAndCreateOrder = catchAsync(async (req, res) => {
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
    return sendError(res, 'Payment credentials are required', 400)
  }
  
  if (!customer || !cartItems || !totalAmount) {
    return sendError(res, 'Order details are required', 400)
  }
  
  try {
    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    hmac.update(razorpayOrderId + '|' + razorpayPaymentId)
    const generated_signature = hmac.digest('hex')
    
    if (generated_signature !== razorpaySignature) {
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
    
    // Fetch payment details from Razorpay to verify
    const paymentDetails = await razorpay.payments.fetch(razorpayPaymentId)
    
    if (paymentDetails.status !== 'captured') {
      return sendError(res, 'Payment was not captured by Razorpay', 400)
    }
    
    // Create order
    const order = new Order({
      items: cartItems,
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
      total: totalAmount,
      status: 'processing', // Auto-confirm after payment success
      paymentStatus: 'paid'
    })
    
    await order.save()
    
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
    
    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId: req.user.userId },
      {
        items: [],
        itemCount: 0,
        totalPrice: 0
      }
    )
    
    sendSuccess(res, {
      order: {
        _id: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: payment._id,
        createdAt: order.createdAt
      },
      message: 'Payment successful. Your order has been placed.'
    }, 201, 'Order created successfully')
  } catch (error) {
    console.error('Payment verification error:', error)
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
