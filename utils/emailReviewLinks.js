// NEW FILE - Email Review Link Generation Utility
import { generateJWTReviewToken } from './reviewToken.js'

/**
 * Generate a complete review link for email inclusion
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {Date} deliveredAt - Delivery date (optional)
 * @param {string} baseUrl - Frontend base URL
 * @returns {object} - { url, token, orderId, email }
 */
export function generateEmailReviewLink(orderId, email, deliveredAt = null, baseUrl = null) {
  try {
    // Validate inputs
    if (!orderId || !email) {
      throw new Error('Order ID and email are required')
    }

    // Use frontend URL from environment or provided base URL
    const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'https://www.kkingsjewellery.com'
    
    // Generate JWT token
    const token = generateJWTReviewToken(orderId, email, deliveredAt)
    
    // Properly encode URL parameters (Step 4 - Safe encoding)
    const encodedOrderId = encodeURIComponent(orderId)
    const encodedToken = encodeURIComponent(token)
    
    // Construct complete review URL with safe encoding
    const reviewUrl = `${frontendUrl}/review?orderId=${encodedOrderId}&token=${encodedToken}`
    
    // Log encoding info for debugging
    console.log('URL ENCODING DEBUG:')
    console.log('- Original token length:', token.length)
    console.log('- Encoded token length:', encodedToken.length)
    console.log('- Encoding changed token:', token !== encodedToken)
    console.log('- Order ID encoded:', orderId !== encodedOrderId)
    
    return {
      url: reviewUrl,
      token: token,
      orderId: orderId,
      email: email,
      expires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      generated: new Date()
    }
  } catch (error) {
    console.error('Error generating email review link:', error.message)
    throw new Error('Failed to generate email review link')
  }
}

/**
 * Generate review links for multiple orders (bulk)
 * @param {Array} orders - Array of { orderId, email, deliveredAt } objects
 * @param {string} baseUrl - Frontend base URL
 * @returns {Array} - Array of review link objects
 */
export function generateBulkEmailReviewLinks(orders, baseUrl = null) {
  return orders.map(order => {
    try {
      return generateEmailReviewLink(
        order.orderId, 
        order.email, 
        order.deliveredAt, 
        baseUrl
      )
    } catch (error) {
      console.error(`Error generating link for order ${order.orderId}:`, error.message)
      return {
        orderId: order.orderId,
        email: order.email,
        error: error.message,
        url: null,
        token: null
      }
    }
  })
}

/**
 * Decode token from URL parameters safely
 * @param {string} encodedToken - URL-encoded JWT token
 * @returns {string} - Decoded token
 */
export function decodeTokenFromUrl(encodedToken) {
  try {
    if (!encodedToken) {
      throw new Error('No token provided')
    }
    
    // Decode URL-encoded token
    const decodedToken = decodeURIComponent(encodedToken)
    
    // Validate JWT format
    if (!decodedToken.startsWith('eyJ')) {
      throw new Error('Invalid token format')
    }
    
    return decodedToken
  } catch (error) {
    console.error('Error decoding token from URL:', error.message)
    throw new Error('Failed to decode token from URL')
  }
}

/**
 * Validate and extract token data from URL parameters
 * @param {string} orderId - Order ID from URL
 * @param {string} encodedToken - URL-encoded JWT token from URL
 * @returns {object} - { orderId, token, valid: boolean, error?: string }
 */
export function validateUrlParameters(orderId, encodedToken) {
  try {
    // Validate inputs
    if (!orderId || !encodedToken) {
      return {
        orderId: orderId || null,
        token: null,
        valid: false,
        error: 'Missing orderId or token'
      }
    }
    
    // Decode token
    const token = decodeTokenFromUrl(encodedToken)
    
    return {
      orderId,
      token,
      valid: true,
      error: null
    }
  } catch (error) {
    return {
      orderId: orderId || null,
      token: null,
      valid: false,
      error: error.message
    }
  }
}

export default {
  generateEmailReviewLink,
  generateBulkEmailReviewLinks,
  decodeTokenFromUrl,
  validateUrlParameters
}
