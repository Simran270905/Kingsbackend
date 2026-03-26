import express from 'express'
import {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getPaymentStatus,
  handlePaymentWebhook,
  getPaymentHistory
} from '../../controllers/paymentController.js'
import { protectCustomer } from '../../middleware/customerAuth.js'

const router = express.Router()

// Protected routes (require authentication)
router.post('/create-order', protectCustomer, createRazorpayOrder)
router.post('/verify', protectCustomer, verifyPaymentAndCreateOrder)
router.get('/:paymentId', protectCustomer, getPaymentStatus)
router.get('/history/all', protectCustomer, getPaymentHistory)

// Public webhook (Razorpay calls this without auth)
router.post('/webhook', handlePaymentWebhook)

export default router
