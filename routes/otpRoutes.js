import express from 'express'
import { sendOTP, verifyOTPController, resendOTP, resetOTPAttempts } from '../controllers/otpController.js'
import { loginRateLimiter } from '../middleware/authMiddleware.js'

const router = express.Router()

// Send OTP (for both login and signup)
router.post('/send-otp', loginRateLimiter, sendOTP)

// Verify OTP
router.post('/verify-otp', verifyOTPController)

// Resend OTP
router.post('/resend-otp', loginRateLimiter, resendOTP)

// Reset OTP attempts (for development/testing)
router.post('/reset-attempts', resetOTPAttempts)

export default router
