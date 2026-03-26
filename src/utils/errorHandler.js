/**
 * API Response and Error Handling
 */

export const sendSuccess = (res, data, statusCode = 200, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  })
}

export const sendError = (res, message, statusCode = 400, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  })
}

export const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next)
    } catch (error) {
      console.error('❌ Error:', error.message)
      
      // Mongoose validation error
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message)
        return sendError(res, 'Validation failed', 400, messages)
      }
      
      // Mongoose duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        return sendError(res, `${field} already exists`, 400)
      }
      
      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 401)
      }
      
      if (error.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 401)
      }
      
      // Generic error
      sendError(res, error.message || 'Internal server error', error.statusCode || 500)
    }
  }
}
