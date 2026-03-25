import express from 'express'
import { sendOTP, verifyOTPController, resendOTP } from '../controllers/otpController.js'
import { loginRateLimiter } from '../middleware/authMiddleware.js'

const router = express.Router()

// Send OTP (for both login and signup)
router.post('/send-otp', loginRateLimiter, sendOTP)

// Verify OTP
router.post('/verify-otp', verifyOTPController)

// Resend OTP
router.post('/resend-otp', loginRateLimiter, resendOTP)

export default router
