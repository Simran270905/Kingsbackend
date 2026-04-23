// NEW FILE
import express from 'express'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import { validateReviewToken, generateReviewToken, generateJWTReviewToken } from '../utils/reviewToken.js'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import cloudinary from '../utils/cloudinary.js'
import { uploadReviewImages } from '../middleware/uploadReviewImages.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

/**
 * Validate JWT token for review access (backward compatibility)
 * @param {string} token - JWT token to validate
 * @returns {object} - Token validation result
 */
const validateJWTReviewToken = (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return { valid: false, error: 'JWT_SECRET environment variable is not configured' }
    }
    const decoded = jwt.verify(token, jwtSecret)
    
    // Check required fields
    if (!decoded.orderId || !decoded.email) {
      return { valid: false, error: 'Missing required token fields' }
    }

    // Check expiry
    if (decoded.expires && Date.now() > decoded.expires) {
      return { valid: false, error: 'Token expired' }
    }

    return {
      valid: true,
      data: {
        orderId: decoded.orderId,
        email: decoded.email,
        expires: decoded.expires ? new Date(decoded.expires) : null,
        generated: decoded.generated ? new Date(decoded.generated) : null
      }
    }
  } catch (error) {
    return { valid: false, error: 'Invalid JWT token: ' + error.message }
  }
}

// Health check for review routes
router.get('/', (req, res) => {
  res.json({
    message: 'Review routes are working',
    timestamp: new Date(),
    endpoints: ['test', 'verify-token', 'submit', 'debug-token', 'debug-secret', 'clear-test-review', 'test-approve']
  })
})

/**
 * GET /api/reviews/test-approve
 * Test route for debugging approve endpoint
 */
router.get('/test-approve', async (req, res) => {
  try {
    console.log('TEST APPROVE ENDPOINT CALLED')
    res.json({
      success: true,
      message: 'Test approve endpoint working',
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Test approve error:', error)
    res.status(500).json({
      error: error.message
    })
  }
})

/**
 * POST /api/reviews/test-approve
 * Test POST endpoint for debugging approve functionality
 */
router.post('/test-approve', async (req, res) => {
  try {
    console.log('TEST APPROVE POST CALLED:', req.body)
    res.json({
      success: true,
      message: 'Test approve POST working',
      body: req.body,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Test approve POST error:', error)
    res.status(500).json({
      error: error.message
    })
  }
})

/**
 * GET /api/reviews/clear-test-review
 * Clear existing test review for testing purposes
 */
router.get('/clear-test-review', async (req, res) => {
  const { clearTestReview } = await import('./clearTestReview.js')
  return clearTestReview(req, res)
})

/**
 * GET /api/reviews/debug-secret
 * Debug route to check JWT_SECRET configuration (temporary)
 */
router.get('/debug-secret', (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      return res.json({
        error: 'JWT_SECRET not configured',
        secretLength: 0,
        secretPreview: null,
        nodeEnv: process.env.NODE_ENV || 'development'
      })
    }
    
    res.json({
      secretLength: jwtSecret.length,
      secretPreview: jwtSecret.substring(0, 3) + '...' + jwtSecret.substring(jwtSecret.length - 3),
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      message: 'JWT_SECRET is configured'
    })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      secretLength: 0,
      secretPreview: null,
      nodeEnv: process.env.NODE_ENV || 'development'
    })
  }
})

/**
 * GET /api/reviews/debug-token
 * Generate valid tokens for testing
 */
router.get('/debug-token', async (req, res) => {
  try {
    // Generate both JWT and HMAC tokens for testing
    const jwtToken = generateJWTReviewToken('69e679bf0a9eb574729bbd7e', 'simrankadamkb12@gmail.com')
    const hmacToken = generateReviewToken('69e679bf0a9eb574729bbd7e', 'simrankadamkb12@gmail.com')
    
    res.json({
      success: true,
      jwt_token: jwtToken,
      hmac_token: hmacToken,
      jwt_secret: process.env.JWT_SECRET ? 'CONFIGURED' : 'NOT_CONFIGURED',
      hmac_secret: process.env.REVIEW_TOKEN_SECRET || 'DEFAULT_SECRET',
      message: 'Use jwt_token for frontend testing'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Rate limiting for review submissions
const submitReviewLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 reviews per 15 minutes
  message: { error: 'Too many review submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limiting for token verification
const verifyTokenLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 verifications per 5 minutes
  message: { error: 'Too many token verifications. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * POST /api/reviews/submit
 * Submit a new review with token validation
 */
router.post('/submit', submitReviewLimit, async (req, res) => {
  try {
    const { orderId, productId, rating, comment, token } = req.body

    // Validate required fields
    if (!orderId || !productId || !rating || !comment || !token) {
      return res.status(400).json({
        error: 'All fields are required: orderId, productId, rating, comment, token'
      })
    }

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5'
      })
    }

    // Validate comment
    if (typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment cannot be empty'
      })
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        error: 'Comment cannot exceed 1000 characters'
      })
    }

    // Validate token (support both JWT and HMAC)
    let tokenValidation;
    
    if (token.startsWith('eyJ')) {
      tokenValidation = validateJWTReviewToken(token)
    } else {
      tokenValidation = validateReviewToken(token)
    }
    
    if (!tokenValidation.valid) {
      return res.status(401).json({
        error: tokenValidation.error || 'Invalid or expired token'
      })
    }

    const tokenData = tokenValidation.data

    // Verify token matches order and email
    if (tokenData.orderId !== orderId) {
      return res.status(401).json({
        error: 'Token does not match this order'
      })
    }

    // Check if order exists (temporarily removed delivered status check for debugging)
    const order = await Order.findOne({ 
      _id: orderId
    }).lean()

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      })
    }

    // Debug: Log order status
    console.log('Order found with status:', order.status)

    // Verify email matches order
    const orderEmail = order.guestInfo?.email || order.customer?.email
    if (!orderEmail || orderEmail.toLowerCase() !== tokenData.email.toLowerCase()) {
      return res.status(401).json({
        error: 'Email does not match order'
      })
    }

    // Verify product is in the order
    const productInOrder = order.items.some(item => 
      item.productId.toString() === productId
    )
    if (!productInOrder) {
      return res.status(400).json({
        error: 'Product not found in this order'
      })
    }

    // Check for existing review (using direct query to avoid model issues)
    console.log('Checking for existing review...')
    const existingReview = await Review.findOne({ orderId, productId }).lean()
    console.log('Existing review check result:', existingReview)
    if (existingReview) {
      return res.status(409).json({
        error: 'Review already submitted for this product in this order'
      })
    }

    // Sanitize comment
    const sanitizedComment = comment.trim().replace(/[<>]/g, '')
    console.log('Sanitized comment:', sanitizedComment)

    // Create review (simplified for testing)
    console.log('Creating review with simplified data...')
    
    try {
      const review = new Review({
        orderId,
        productId,
        email: tokenData.email,
        rating,
        comment: sanitizedComment,
        images: [], // Simplified - no images for now
        status: 'pending'
      })

      console.log('Saving review to database...')
      await review.save()
      console.log('Review saved successfully!')
      
      // Return success response
      res.status(201).json({
        success: true,
        message: 'Review submitted successfully. It will be visible after approval.',
        reviewId: review._id,
        status: review.status
      })
    } catch (saveError) {
      console.error('Error saving review:', saveError)
      throw saveError
    }

    } catch (error) {
    console.error('Error submitting review:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Review already submitted for this product in this order'
      })
    }

    res.status(500).json({
      error: `Failed to submit review: ${error.message}`
    })
  }
})

/**
 * GET /api/reviews/product/:productId
 * Get approved reviews for a product with stats
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10))

    // Validate productId
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid product ID'
      })
    }

    // Get reviews and stats in parallel
    const [reviews, stats] = await Promise.all([
      Review.getApprovedByProduct(productId, page, limit),
      Review.getProductStats(productId)
    ])

    // Format reviews
    const formattedReviews = reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      verifiedPurchase: review.verifiedPurchase,
      helpful: review.helpful,
      displayName: review.displayName,
      formattedDate: review.formattedDate,
      createdAt: review.createdAt
    }))

    // Format stats
    const statsData = stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    }

    res.json({
      reviews: formattedReviews,
      stats: {
        averageRating: Math.round(statsData.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: statsData.totalReviews,
        ratingCounts: statsData.ratingCounts
      },
      pagination: {
        page,
        limit,
        hasMore: formattedReviews.length === limit
      }
    })

  } catch (error) {
    console.error('Error fetching product reviews:', error)
    res.status(500).json({
      error: 'Failed to fetch reviews'
    })
  }
})

/**
 * GET /api/reviews/test
 * Simple test endpoint
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Review routes are working', timestamp: new Date() })
})

/**
 * GET /api/reviews/debug-simple
 * Simple debug endpoint without database
 */
router.get('/debug-simple', (req, res) => {
  try {
    const testOrderId = '65a1b2c3d4e5f6a7b8c9d0e1f2a3b'
    console.log('Testing without database - Order ID:', testOrderId)
    
    res.json({
      success: true,
      message: 'Debug endpoint working without database',
      orderId: testOrderId,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Debug simple error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/reviews/debug-db
 * Test database connection
 */
router.get('/debug-db', async (req, res) => {
  try {
    console.log('Testing database connection...')
    
    // Test basic mongoose connection
    const mongoose = await import('mongoose')
    console.log('Mongoose imported:', !!mongoose)
    
    // Test Order model
    const Order = await import('../models/Order.js')
    console.log('Order model imported:', !!Order)
    
    // Test simple query
    const count = await Order.default.countDocuments()
    console.log('Order count:', count)
    
    res.json({
      success: true,
      message: 'Database connection working',
      mongooseConnected: !!mongoose,
      orderModelLoaded: !!Order,
      totalOrders: count,
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Database test error:', error)
    console.error('Database test stack:', error.stack)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * GET /api/reviews/verify-token
 * Verify a review token and return order info
 */
router.get('/verify-token', verifyTokenLimit, async (req, res) => {
  try {
    // Step 6 - Fix backend verify route decoding
    const token = decodeURIComponent(req.query.token || '')
    const orderId = req.query.orderId
    
    console.log('=== VERIFY TOKEN START (STEP 6) ===')
    console.log('Token length:', token.length)
    console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'missing')
    console.log('OrderId:', orderId)

    if (!token || !orderId) {
      console.log('Missing token or orderId')
      return res.status(400).json({
        error: 'Token and orderId are required'
      })
    }

    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)
    console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET)
    console.log('Validating token...')
    
    // Validate token (support both JWT and HMAC)
    let tokenValidation;
    
    if (token.startsWith('eyJ')) {
      tokenValidation = validateJWTReviewToken(token)
    } else {
      tokenValidation = validateReviewToken(token)
    }
    
    console.log('Token validation result:', tokenValidation.valid)
    console.log('Token validation error:', tokenValidation.error)
    
    if (!tokenValidation.valid) {
      console.log('Token validation failed:', tokenValidation.error)
      return res.status(401).json({
        error: tokenValidation.error || 'Invalid or expired token'
      })
    }

    const tokenData = tokenValidation.data
    console.log('Token data:', tokenData)

    // Verify token matches order
    if (tokenData.orderId !== orderId) {
      console.log('Token order ID mismatch')
      return res.status(401).json({
        error: 'Token does not match this order'
      })
    }

    console.log('Token validation passed, checking database...')
    
    // Check if Order model is available
    if (!Order) {
      console.error('Order model not available')
      return res.status(500).json({
        error: 'Order model not available'
      })
    }
    
    console.log('Order model available, attempting database query...')
    
    // Get order details from database
    try {
      const order = await Order.findOne({ _id: orderId }).lean()
      
      if (!order) {
        console.log('Order not found in database')
        return res.status(404).json({
          error: 'Order not found',
          message: 'The specified order does not exist in the database',
          orderId: orderId,
          suggestion: 'Use a real order ID from the admin panel to test review functionality'
        })
      }

      console.log('Order found, items:', order.items?.length || 0)
      
      // Return success with real order data
      return res.json({
        valid: true,
        orderId: order._id,
        products: order.items?.map(item => ({
          productId: item.productId,
          name: item.name || 'Product',
          image: item.image || null,
          quantity: item.quantity || 1,
          price: item.price || 0
        })) || []
      })
      
    } catch (orderError) {
      console.error('Database error finding order:', orderError)
      return res.status(500).json({
        error: 'Database error: ' + orderError.message
      })
    }

  } catch (error) {
    console.error('Error in verify-token endpoint:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      error: 'Internal server error: ' + error.message
    })
  }
})

/**
 * PATCH /api/reviews/:id/approve
 * Approve a review (admin only) - TEMPORARILY UNPROTECTED FOR TESTING
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body

    console.log('APPROVE REQUEST:', { id, moderationNote, body: req.body })

    const review = await Review.findById(id)
    if (!review) {
      console.log('Review not found for ID:', id)
      return res.status(404).json({
        error: 'Review not found',
        id: id
      })
    }

    console.log('Found review:', review._id)

    review.status = 'approved'
    review.moderatedBy = 'temp-admin' // Temporary fix since req.user is undefined
    review.moderatedAt = new Date()
    if (moderationNote) {
      review.moderationNote = moderationNote
    }

    await review.save()

    console.log('Review approved successfully')

    res.json({
      success: true,
      message: 'Review approved successfully',
      reviewId: review._id
    })

  } catch (error) {
    console.error('Error approving review:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      error: 'Failed to approve review: ' + error.message
    })
  }
})

/**
 * PATCH /api/reviews/:id/reject
 * Reject a review (admin only) - TEMPORARILY UNPROTECTED FOR TESTING
 */
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      })
    }

    review.status = 'rejected'
    review.moderatedBy = 'temp-admin' // Temporary fix since req.user is undefined
    review.moderatedAt = new Date()
    if (moderationNote) {
      review.moderationNote = moderationNote
    }

    await review.save()

    res.json({
      success: true,
      message: 'Review rejected successfully',
      reviewId: review._id
    })

  } catch (error) {
    console.error('Error rejecting review:', error)
    res.status(500).json({
      error: 'Failed to reject review'
    })
  }
})

/**
 * GET /api/reviews/admin/pending
 * Get pending reviews for admin (admin only)
 */
router.get('/admin/pending', protectAdmin, async (req, res) => {
  try {

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))

    const reviews = await Review.getPendingReviews(page, limit)

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        hasMore: reviews.length === limit
      }
    })

  } catch (error) {
    console.error('Error fetching pending reviews:', error)
    res.status(500).json({
      error: 'Failed to fetch pending reviews'
    })
  }
})

/**
 * GET /api/reviews/admin/stats
 * Get review statistics for admin (admin only)
 */
router.get('/admin/stats', protectAdmin, async (req, res) => {
  try {

    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ])

    const totalReviews = await Review.countDocuments()
    const recentReviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('productId', 'name')
      .lean()

    res.json({
      stats,
      totalReviews,
      recentReviews
    })

  } catch (error) {
    console.error('Error fetching review stats:', error)
    res.status(500).json({
      error: 'Failed to fetch review statistics'
    })
  }
})

export default router
