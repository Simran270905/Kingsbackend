import jwt from 'jsonwebtoken'
import { sendError } from '../../utils/errorHandler.js'

// Protect customer routes
export const protectCustomer = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return sendError(res, 'Authorization token required', 401)
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    if (decoded.role !== 'customer') {
      return sendError(res, 'Invalid user role', 403)
    }
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
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
