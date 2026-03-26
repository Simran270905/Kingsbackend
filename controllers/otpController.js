import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'
import { generateOTP, hashOTP, verifyOTP, sendEmailOTP, sendSMSOTP } from '../utils/otpService.js'

// Send OTP
export const sendOTP = catchAsync(async (req, res) => {
  console.log('📧 Send OTP request received:', req.body)
  
  const { name, email, phone } = req.body

  // Validation
  if (!name || !email) {
    console.log('❌ Validation failed: missing name or email')
    return sendError(res, 'Name and email are required', 400)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('❌ Validation failed: invalid email format')
    return sendError(res, 'Please enter a valid email address', 400)
  }

  if (phone && !/^[0-9]{10}$/.test(phone)) {
    console.log('❌ Validation failed: invalid phone format')
    return sendError(res, 'Please enter a valid 10-digit phone number', 400)
  }

  console.log('✅ Validation passed, processing OTP request for:', email)

  // Check if user exists by email
  let user = await User.findOne({ email })
  console.log('👤 User found:', !!user)

  // Generate OTP
  const otpCode = generateOTP()
  const hashedOTP = await hashOTP(otpCode)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  console.log('🔢 OTP generated:', otpCode)

  if (user) {
    // Existing user - update OTP and phone if provided
    user.otp = {
      code: hashedOTP,
      expiresAt,
      attempts: 0
    }
    if (phone && phone !== user.phone) {
      user.phone = phone
    }
    await user.save()
    console.log('✅ Existing user updated with new OTP')
  } else {
    // New user - create account
    const firstName = name.split(' ')[0]
    const lastName = name.split(' ').slice(1).join(' ') || ''
    
    user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      otp: {
        code: hashedOTP,
        expiresAt,
        attempts: 0
      }
    })
    console.log('✅ New user created with OTP')
  }

  // Send OTP via email with enhanced error handling
  try {
    console.log('📧 Attempting to send OTP via email to:', email)
    const emailResult = await sendEmailOTP(email, otpCode, name)
    console.log('✅ Email sent successfully')
    console.log('📧 Message ID:', emailResult.messageId)
    
    // Only return success if email was actually sent
    sendSuccess(res, { 
      message: 'OTP sent successfully to your email',
      emailSent: true,
      messageId: emailResult.messageId
    }, 200, 'OTP sent successfully')
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message)
    
    // Check if it's a configuration error
    if (error.message.includes('Email credentials not configured')) {
      return sendError(res, 'Email service is not configured. Please contact support.', 503)
    }
    
    // Check if it's an authentication error
    if (error.message.includes('Authentication') || error.message.includes('EAUTH')) {
      return sendError(res, 'Email service authentication failed. Please contact support.', 503)
    }
    
    // Check if it's a connection error
    if (error.message.includes('connection') || error.message.includes('ECONNECTION') || error.message.includes('timeout')) {
      return sendError(res, 'Email service is temporarily unavailable. Please try again later.', 503)
    }
    
    // For any other email errors, return a generic error
    return sendError(res, 'Failed to send OTP. Please try again later.', 500)
  }
})

// Verify OTP
export const verifyOTPController = catchAsync(async (req, res) => {
  const { email, otp } = req.body

  // Validation
  if (!email || !otp) {
    return sendError(res, 'Email and OTP are required', 400)
  }

  if (!/^[0-9]{4,6}$/.test(otp)) {
    return sendError(res, 'Invalid OTP format', 400)
  }

  // Find user by email
  const user = await User.findOne({ email })

  if (!user) {
    return sendError(res, 'User not found', 404)
  }

  // Check if OTP exists and is not expired
  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    return sendError(res, 'No OTP request found. Please request a new OTP.', 400)
  }

  // Check if OTP has expired
  if (new Date() > user.otp.expiresAt) {
    return sendError(res, 'OTP has expired. Please request a new OTP.', 400)
  }

  // Check if too many attempts
  if (user.otp.attempts >= 3) {
    return sendError(res, 'Too many failed attempts. Please request a new OTP.', 400)
  }

  // Verify OTP
  const isValidOTP = await verifyOTP(otp, user.otp.code)
  
  if (!isValidOTP) {
    // Increment attempts
    user.otp.attempts += 1
    await user.save()
    
    const remainingAttempts = 3 - user.otp.attempts
    if (remainingAttempts > 0) {
      return sendError(res, `Invalid OTP. ${remainingAttempts} attempts remaining.`, 400)
    } else {
      return sendError(res, 'Too many failed attempts. Please request a new OTP.', 400)
    }
  }

  // OTP is valid - authenticate user
  user.verified = true
  user.lastLogin = new Date()
  user.otp = undefined // Clear OTP
  await user.save()

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      phone: user.phone,
      role: 'customer'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  sendSuccess(res, {
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      verified: user.verified
    }
  }, 200, 'Authentication successful')
})

// Reset OTP attempts (for development/testing)
export const resetOTPAttempts = catchAsync(async (req, res) => {
  const { email } = req.body

  if (!email) {
    return sendError(res, 'Email is required', 400)
  }

  const user = await User.findOne({ email })
  if (!user) {
    return sendError(res, 'User not found', 404)
  }

  // Clear OTP and reset attempts
  user.otp = undefined
  await user.save()

  sendSuccess(res, null, 200, 'OTP attempts reset successfully')
})

// Resend OTP
export const resendOTP = catchAsync(async (req, res) => {
  const { email } = req.body

  // Validation
  if (!email) {
    return sendError(res, 'Email is required', 400)
  }

  // Find user by email
  const user = await User.findOne({ email })

  if (!user) {
    return sendError(res, 'User not found', 404)
  }

  // Generate new OTP
  const otpCode = generateOTP()
  const hashedOTP = await hashOTP(otpCode)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // Update user OTP
  user.otp = {
    code: hashedOTP,
    expiresAt,
    attempts: 0
  }
  await user.save()

  // Send OTP via email only
  try {
    console.log('📧 Attempting to resend OTP via email to:', email)
    const fullName = `${user.firstName} ${user.lastName}`.trim()
    const emailResult = await sendEmailOTP(email, otpCode, fullName)
    console.log('✅ Resend email sent successfully')
    console.log('📧 Message ID:', emailResult.messageId)
    
    sendSuccess(res, {
      message: 'OTP resent successfully to your email',
      emailSent: true,
      messageId: emailResult.messageId
    }, 200, 'OTP resent successfully')
    
  } catch (error) {
    console.error('❌ Email resend failed:', error.message)
    
    // Check if it's a configuration error
    if (error.message.includes('Email credentials not configured')) {
      return sendError(res, 'Email service is not configured. Please contact support.', 503)
    }
    
    // Check if it's an authentication error
    if (error.message.includes('Authentication') || error.message.includes('EAUTH')) {
      return sendError(res, 'Email service authentication failed. Please contact support.', 503)
    }
    
    // Check if it's a connection error
    if (error.message.includes('connection') || error.message.includes('ECONNECTION') || error.message.includes('timeout')) {
      return sendError(res, 'Email service is temporarily unavailable. Please try again later.', 503)
    }
    
    // For any other email errors, return a generic error
    return sendError(res, 'Failed to resend OTP. Please try again later.', 500)
  }
})
