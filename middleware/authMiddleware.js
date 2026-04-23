import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

// General rate limiter middleware
export const createRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
    standardHeaders: true,
    legacyHeaders: false,
  })

// Strict login rate limiter: 10 attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
})

export const protectAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization token provided')
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    console.log('🔍 Admin auth token length:', token.length)
    console.log('🔍 Admin auth token preview:', token.substring(0, 20) + '...')

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔍 Admin auth decoded:', decoded)

    // Check if user has admin role
    if (!decoded.role || decoded.role !== 'admin') {
      console.log('❌ User is not admin:', decoded.role)
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      })
    }

    console.log('✅ Admin authentication successful')
    req.admin = decoded
    next()

  } catch (error) {
    console.log("❌ VERIFY ERROR:", error.message)

    return res.status(401).json({
      success: false,
      message:
        error.name === 'TokenExpiredError'
          ? 'Token expired'
          : 'Invalid authorization token'
    })
  }
}

// Alias for consistency with route imports
export const authenticateAdmin = protectAdmin