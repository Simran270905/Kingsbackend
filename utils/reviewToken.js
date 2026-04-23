// NEW FILE
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const REVIEW_TOKEN_SECRET = 'kkings-review-token-secret-2024' // Hardcoded for production consistency
const TOKEN_EXPIRY_DAYS = 7

/**
 * Generate a JWT token for review access (recommended method)
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {Date} deliveredAt - Delivery date (optional)
 * @returns {string} - JWT token
 */
export function generateJWTReviewToken(orderId, email, deliveredAt = null) {
  try {
    // Validate inputs
    if (!orderId || !email) {
      throw new Error('Order ID and email are required')
    }

    // Create payload with expiry
    const expiryDate = deliveredAt 
      ? new Date(deliveredAt.getTime() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
      : new Date(Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000))

    const payload = {
      orderId: orderId.toString(),
      email: email.toLowerCase().trim(),
      expires: expiryDate.getTime(),
      generated: Date.now()
    }

    // Generate JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret')
    
    return token
  } catch (error) {
    console.error('Error generating JWT review token:', error.message)
    throw new Error('Failed to generate JWT review token')
  }
}

/**
 * Generate a secure HMAC token for review access
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {Date} deliveredAt - Delivery date (optional)
 * @returns {string} - HMAC token
 */
export function generateReviewToken(orderId, email, deliveredAt = null) {
  try {
    // Validate inputs
    if (!orderId || !email) {
      throw new Error('Order ID and email are required')
    }

    // Create header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }

    // Create payload with expiry
    const expiryDate = deliveredAt 
      ? new Date(deliveredAt.getTime() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
      : new Date(Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000))

    const payload = {
      orderId: orderId.toString(),
      email: email.toLowerCase().trim(),
      expires: expiryDate.getTime(),
      generated: Date.now()
    }

    // Create HMAC signature
    const headerString = JSON.stringify(header)
    const payloadString = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', REVIEW_TOKEN_SECRET)
      .update(headerString + '.' + payloadString)
      .digest('hex')

    // Combine header, payload, and signature
    const token = Buffer.from(headerString).toString('base64').replace(/=/g, '') + '.' + 
                   Buffer.from(payloadString).toString('base64').replace(/=/g, '') + '.' + signature

    return token
  } catch (error) {
    console.error('Error generating review token:', error.message)
    throw new Error('Failed to generate review token')
  }
}

/**
 * Validate a review token
 * @param {string} token - Review token to validate
 * @returns {object} - Token data or error
 */
export function validateReviewToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' }
    }

    // Split token into header, payload, and signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token structure' }
    }

    const [headerBase64, payloadBase64, signature] = parts

    // Decode payload
    let payload
    try {
      const payloadString = Buffer.from(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
      payload = JSON.parse(payloadString)
    } catch (error) {
      return { valid: false, error: 'Invalid token payload' }
    }

    // Verify required fields
    if (!payload.orderId || !payload.email || !payload.expires) {
      return { valid: false, error: 'Missing required token fields' }
    }

    // Check expiry
    if (Date.now() > payload.expires) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify HMAC signature
    const headerString = Buffer.from(headerBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    const payloadString = JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', REVIEW_TOKEN_SECRET)
      .update(headerString + '.' + payloadString)
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' }
    }

    // Token is valid
    return {
      valid: true,
      data: {
        orderId: payload.orderId,
        email: payload.email,
        expires: new Date(payload.expires),
        generated: new Date(payload.generated)
      }
    }
  } catch (error) {
    console.error('Error validating review token:', error.message)
    return { valid: false, error: 'Token validation failed' }
  }
}

/**
 * Check if token is expired
 * @param {string} token - Review token
 * @returns {boolean} - True if expired
 */
export function isTokenExpired(token) {
  const validation = validateReviewToken(token)
  return !validation.valid || validation.error === 'Token expired'
}

/**
 * Extract token info without validation (for debugging)
 * @param {string} token - Review token
 * @returns {object} - Token info or null
 */
export function extractTokenInfo(token) {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 2) {
      return null
    }

    const [payloadBase64] = parts
    const payloadString = Buffer.from(payloadBase64, 'base64').toString()
    const payload = JSON.parse(payloadString)

    return {
      orderId: payload.orderId,
      email: payload.email,
      expires: new Date(payload.expires),
      generated: new Date(payload.generated),
      isExpired: Date.now() > payload.expires
    }
  } catch (error) {
    return null
  }
}

/**
 * Generate review link URL
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {Date} deliveredAt - Delivery date
 * @param {string} baseUrl - Base URL for frontend
 * @returns {string} - Complete review link
 */
export function generateReviewLink(orderId, email, deliveredAt = null, baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173') {
  try {
    const token = generateReviewToken(orderId, email, deliveredAt)
    return `${baseUrl}/review?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`
  } catch (error) {
    console.error('Error generating review link:', error.message)
    return null
  }
}

/**
 * Bulk generate tokens for multiple orders
 * @param {Array} orders - Array of orders with orderId, email, deliveredAt
 * @returns {Array} - Array of {orderId, token, link} objects
 */
export function bulkGenerateTokens(orders, baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173') {
  return orders.map(order => {
    try {
      const token = generateReviewToken(order.orderId, order.email, order.deliveredAt)
      const link = `${baseUrl}/review?orderId=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(token)}`
      
      return {
        orderId: order.orderId,
        email: order.email,
        token,
        link,
        expires: new Date(Date.now() + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
      }
    } catch (error) {
      console.error(`Error generating token for order ${order.orderId}:`, error.message)
      return {
        orderId: order.orderId,
        email: order.email,
        token: null,
        link: null,
        error: error.message
      }
    }
  })
}

export default {
  generateReviewToken,
  validateReviewToken,
  isTokenExpired,
  extractTokenInfo,
  generateReviewLink,
  bulkGenerateTokens,
  TOKEN_EXPIRY_DAYS
}
