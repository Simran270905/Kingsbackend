// NEW FILE
import { generateReviewToken } from './reviewToken.js'

/**
 * Generate a review link for a specific order
 * This is a helper function for manual use - DO NOT integrate directly into Shiprocket webhook
 * 
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email from order
 * @param {Date} deliveredAt - When order was delivered (optional)
 * @param {string} baseUrl - Frontend base URL (optional, defaults to process.env.FRONTEND_URL)
 * @returns {string} - Complete review URL or null if error
 */
export function generateReviewLink(orderId, email, deliveredAt = null, baseUrl = null) {
  try {
    // Validate inputs
    if (!orderId || !email) {
      console.error('generateReviewLink: orderId and email are required')
      return null
    }

    // Get base URL from parameter or environment
    const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173'

    // Generate secure token
    const token = generateReviewToken(orderId, email, deliveredAt)
    if (!token) {
      console.error('generateReviewLink: Failed to generate token')
      return null
    }

    // Construct review URL
    const reviewUrl = `${frontendUrl}/review?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`

    return reviewUrl
  } catch (error) {
    console.error('Error generating review link:', error.message)
    return null
  }
}

/**
 * Generate review links for multiple delivered orders
 * Useful for bulk email campaigns or admin tools
 * 
 * @param {Array} orders - Array of order objects with orderId, email, deliveredAt
 * @param {string} baseUrl - Frontend base URL (optional)
 * @returns {Array} - Array of {orderId, email, link, error} objects
 */
export function generateBulkReviewLinks(orders, baseUrl = null) {
  return orders.map(order => {
    try {
      const link = generateReviewLink(
        order.orderId,
        order.email,
        order.deliveredAt,
        baseUrl
      )

      return {
        orderId: order.orderId,
        email: order.email,
        link,
        success: !!link,
        error: link ? null : 'Failed to generate link'
      }
    } catch (error) {
      return {
        orderId: order.orderId,
        email: order.email,
        link: null,
        success: false,
        error: error.message
      }
    }
  })
}

/**
 * Find delivered orders and generate review links
 * This is a utility function for admin use
 * 
 * @param {Date} fromDate - Start date for delivered orders (optional)
 * @param {Date} toDate - End date for delivered orders (optional)
 * @param {string} baseUrl - Frontend base URL (optional)
 * @returns {Promise<Array>} - Array of review links for delivered orders
 */
export async function generateReviewLinksForDeliveredOrders(fromDate = null, toDate = null, baseUrl = null) {
  try {
    // Import here to avoid circular dependencies
    const Order = (await import('../models/Order.js')).default

    // Build query for delivered orders
    const query = { 
      status: { $regex: /^delivered$/i } 
    }

    // Add date range if provided
    if (fromDate || toDate) {
      query.deliveredAt = {}
      if (fromDate) query.deliveredAt.$gte = fromDate
      if (toDate) query.deliveredAt.$lte = toDate
    }

    // Find delivered orders
    const orders = await Order.find(query)
      .select('_id deliveredAt guestInfo customer')
      .lean()

    // Extract order data
    const orderData = orders.map(order => {
      const email = order.guestInfo?.email || order.customer?.email
      return {
        orderId: order._id.toString(),
        email,
        deliveredAt: order.deliveredAt
      }
    }).filter(order => order.email) // Only include orders with email

    // Generate review links
    return generateBulkReviewLinks(orderData, baseUrl)

  } catch (error) {
    console.error('Error generating review links for delivered orders:', error.message)
    return []
  }
}

/**
 * Validate a review link without making API calls
 * Just checks if the URL structure is valid
 * 
 * @param {string} reviewUrl - Review URL to validate
 * @returns {boolean} - True if URL structure is valid
 */
export function validateReviewLinkStructure(reviewUrl) {
  try {
    if (!reviewUrl || typeof reviewUrl !== 'string') {
      return false
    }

    const url = new URL(reviewUrl)
    const params = new URLSearchParams(url.search)

    // Check required parameters
    const hasOrderId = params.has('orderId')
    const hasToken = params.has('token')

    // Check if orderId and token are not empty
    const orderId = params.get('orderId')
    const token = params.get('token')

    return hasOrderId && hasToken && orderId && token
  } catch (error) {
    return false
  }
}

/**
 * Extract order ID from review link
 * 
 * @param {string} reviewUrl - Review URL
 * @returns {string|null} - Order ID or null if invalid
 */
export function extractOrderIdFromLink(reviewUrl) {
  try {
    if (!validateReviewLinkStructure(reviewUrl)) {
      return null
    }

    const url = new URL(reviewUrl)
    return url.searchParams.get('orderId')
  } catch (error) {
    return null
  }
}

/**
 * Generate review link for a specific product in an order
 * This can be used when you want to direct customer to review a specific product
 * 
 * @param {string} orderId - Order ID
 * @param {string} email - Customer email
 * @param {string} productId - Product ID (optional, for pre-selection)
 * @param {Date} deliveredAt - Delivery date (optional)
 * @param {string} baseUrl - Frontend base URL (optional)
 * @returns {string} - Review URL with product pre-selected
 */
export function generateProductReviewLink(orderId, email, productId = null, deliveredAt = null, baseUrl = null) {
  try {
    const baseLink = generateReviewLink(orderId, email, deliveredAt, baseUrl)
    
    if (!baseLink) {
      return null
    }

    // Add product parameter if provided
    if (productId) {
      const url = new URL(baseLink)
      url.searchParams.set('product', productId)
      return url.toString()
    }

    return baseLink
  } catch (error) {
    console.error('Error generating product review link:', error.message)
    return null
  }
}

export default {
  generateReviewLink,
  generateBulkReviewLinks,
  generateReviewLinksForDeliveredOrders,
  validateReviewLinkStructure,
  extractOrderIdFromLink,
  generateProductReviewLink
}
