import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

// General rate limiter middleware
export const createRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })

// Strict login rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
})

// Admin authentication middleware
export const protectAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

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

// Customer authentication middleware
export const protectCustomer = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    
    // Check for empty or invalid tokens
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
  } catch (error) {
    console.log("❌ VERIFY ERROR:", error.message)

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      })
    }

    return res.status(401).json({
      success: false,
        message: 'Invalid authorization token'
    })
  }
}

// Generic authentication middleware (works for both admin and customer)
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    
    // Check for empty or invalid tokens
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
  } catch (error) {
    console.log("❌ VERIFY ERROR:", error.message)

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      })
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token'
    })
  }
}

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      })
    }
    next()
  }
}

// Admin role check
export const adminOnly = authorize('admin')

// Customer role check
export const customerOnly = authorize('customer')
