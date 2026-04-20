import express from 'express'
import { verifyPayment, getOrderDetails, trackOrder } from '../controllers/payment.controller.js'
import { handleShiprocketWebhook } from '../controllers/shiprocketWebhookController.js'

const router = express.Router()

// POST /api/payment/verify - Verify Razorpay payment and create order
router.post('/verify', verifyPayment)

// POST /api/payment/fulfillment/update - Handle fulfillment webhook
router.post('/fulfillment/update', handleShiprocketWebhook)

// GET /api/payment/orders/:orderId - Get order details by order ID
router.get('/orders/:orderId', getOrderDetails)

// GET /api/payment/orders/:orderId/track - Track order by order ID
router.get('/orders/:orderId/track', trackOrder)

export default router
