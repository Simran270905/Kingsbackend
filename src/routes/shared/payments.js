import express from 'express'
import { 
  getPaymentStatus, 
  createRazorpayOrder, 
  verifyPaymentAndCreateOrder, 
  getPaymentHistory 
} from '../../controllers/shared/paymentController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/status/:paymentId', getPaymentStatus)

// Protected routes
router.post('/create-order', authenticate, createRazorpayOrder)
router.post('/verify', authenticate, verifyPaymentAndCreateOrder)
router.get('/history', authenticate, getPaymentHistory)

export default router
