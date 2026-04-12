import express from 'express'
import { sendOTP, verifyOTPController, resendOTP, resetOTPAttempts } from '../controllers/otpController.js'
import { loginRateLimiter } from '../middleware/authMiddleware.js'
import { sendEmailOTP } from '../utils/otpService.js'

const router = express.Router()

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body
    
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      })
    }
    
    const testOTP = '123456'
    const result = await sendEmailOTP(email, testOTP, name)
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        emailSent: true,
        messageId: result.messageId,
        testOTP
      }
    })
  } catch (error) {
    console.error('Test email error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    })
  }
})

// Send OTP (for both login and signup)
router.post('/send-otp', loginRateLimiter, sendOTP)

// Verify OTP
router.post('/verify-otp', verifyOTPController)

// Resend OTP
router.post('/resend-otp', loginRateLimiter, resendOTP)

// Reset OTP attempts (for development/testing)
router.post('/reset-attempts', resetOTPAttempts)

export default router
