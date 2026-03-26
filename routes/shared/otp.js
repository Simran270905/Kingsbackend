import express from 'express'
import { sendOTP, verifyOTPController, resendOTP } from '../controllers/shared/shared/otpController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// OTP routes
router.post('/send-otp', sendOTP)
router.post('/verify-otp', verifyOTPController)
router.post('/resend-otp', resendOTP)

export default router
