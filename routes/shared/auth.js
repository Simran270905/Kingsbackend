import express from 'express'
import { sendOTP, verifyOTPController, resendOTP } from '../../controllers/shared/otpController.js'
import { authenticate } from '../../middleware/authMiddleware.js'

const router = express.Router()

// OTP-based authentication routes
router.post('/send-otp', sendOTP)
router.post('/verify-otp', verifyOTPController)
router.post('/resend-otp', resendOTP)

// Protected routes (for token refresh, logout, etc.)
router.post('/logout', authenticate, (req, res) => {
  // Logout logic here
  res.json({ success: true, message: 'Logged out successfully' })
})

router.post('/refresh', authenticate, (req, res) => {
  // Token refresh logic here
  res.json({ success: true, message: 'Token refreshed' })
})

export default router
