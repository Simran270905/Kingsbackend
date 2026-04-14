import express from 'express'
import { 
  getPaymentStatus, 
  createRazorpayOrder, 
  verifyPaymentAndCreateOrder, 
  getPaymentHistory 
} from '../../controllers/shared/paymentController.js'

const router = express.Router()

// Public routes for guest checkout
router.get('/status/:paymentId', getPaymentStatus)
router.post('/create-razorpay-order', createRazorpayOrder)
router.post('/verify', verifyPaymentAndCreateOrder)
router.get('/history', getPaymentHistory)

export default router
