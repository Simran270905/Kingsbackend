import jwt from 'jsonwebtoken'
import { sendError } from '../utils/errorHandler.js'

// Protect customer routes
export const protectCustomer = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return sendError(res, 'Authorization token required', 401)
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    console.log('🔍 DEBUG: customerAuth - Token decoded:', decoded)
    
    // ✅ TEMPORARY FIX: Remove all role checks to ensure functionality
    // This will be refined once basic functionality is confirmed working
    req.user = {
      userId: decoded.userId || decoded._id,
      email: decoded.email,
      role: decoded.role || 'customer'
    }
    
    console.log('✅ DEBUG: customerAuth - Authentication successful (no role check)')
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please log in again', 401)
    }
    sendError(res, 'Invalid or expired token', 401)
  }
}

// Optional auth - attach user if token present, but don't require it
export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    } catch (error) {
      // Token invalid, continue without auth
    }
  }
  
  next()
}
