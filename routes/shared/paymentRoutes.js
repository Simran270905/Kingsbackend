import express from 'express'
import {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getPaymentStatus,
  handlePaymentWebhook,
  getPaymentHistory
} from '../controllers/shared/paymentController.js'
import { protectCustomer } from '../middleware/customerAuth.js'

const router = express.Router()

// Public routes (for guest checkout)
router.post('/create-order', createRazorpayOrder)
router.post('/verify-payment', verifyPaymentAndCreateOrder) // Public for guest checkout

// Protected routes (require authentication)
router.post('/verify', protectCustomer, verifyPaymentAndCreateOrder) // Legacy endpoint
router.get('/:paymentId', protectCustomer, getPaymentStatus)
router.get('/history/all', protectCustomer, getPaymentHistory)

// Public webhook (Razorpay calls this without auth)
router.post('/webhook', handlePaymentWebhook)

export default router
