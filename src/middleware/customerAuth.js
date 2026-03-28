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
    
    // ✅ FIXED: Allow any authenticated user, don't strictly require 'customer' role
    // This fixes issues where tokens don't have role set
    if (decoded.role && decoded.role !== 'customer' && decoded.role !== 'user') {
      return sendError(res, 'Invalid user role', 403)
    }
    
    req.user = {
      userId: decoded.userId || decoded._id,
      email: decoded.email,
      role: decoded.role || 'customer' // Default to customer if no role specified
    }
    
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
