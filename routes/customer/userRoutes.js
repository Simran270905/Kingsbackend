import express from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  deleteAddress,
  getOrderHistory
} from '../controllers/customer/userController.js'
import {
  sendOTP,
  verifyOTPController,
  resendOTP
} from '../controllers/shared/otpController.js'
import { protectCustomer } from '../middleware/customerAuth.js'
import { loginRateLimiter } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.post('/send-otp', loginRateLimiter, sendOTP)
router.post('/verify-otp', loginRateLimiter, verifyOTPController)
router.post('/resend-otp', loginRateLimiter, resendOTP)

// Protected routes (require authentication)
router.get('/profile', protectCustomer, getProfile)
router.put('/profile', protectCustomer, updateProfile)
router.post('/change-password', protectCustomer, changePassword)
router.get('/addresses', protectCustomer, getAddresses)
router.post('/addresses', protectCustomer, addAddress)
router.delete('/addresses/:addressIndex', protectCustomer, deleteAddress)
router.get('/orders', protectCustomer, getOrderHistory)

export default router
