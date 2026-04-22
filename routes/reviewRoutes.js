// NEW FILE
import express from 'express'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import { validateReviewToken, generateReviewToken } from '../utils/reviewToken.js'
import rateLimit from 'express-rate-limit'
import cloudinary from '../utils/cloudinary.js'
import { uploadReviewImages } from '../middleware/uploadReviewImages.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

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
router.post('/submit', submitReviewLimit, uploadReviewImages, async (req, res) => {
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

    // Validate token
    const tokenValidation = validateReviewToken(token)
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

    // Check if order exists and is delivered
    const order = await Order.findOne({ 
      _id: orderId,
      status: { $regex: /^delivered$/i } // Case-insensitive "delivered"
    }).lean()

    if (!order) {
      return res.status(404).json({
        error: 'Order not found or not delivered'
      })
    }

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

    // Check for existing review
    const existingReview = await Review.checkExistingReview(orderId, productId)
    if (existingReview) {
      return res.status(409).json({
        error: 'Review already submitted for this product in this order'
      })
    }

    // Sanitize comment
    const sanitizedComment = comment.trim().replace(/[<>]/g, '')

    // ADD THIS LOGIC BEFORE saving review
    let uploadedImages = [];

    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          // Upload to Cloudinary using buffer
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { 
                folder: 'reviews',
                resource_type: 'image',
                format: 'auto',
                quality: 'auto'
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            uploadStream.end(file.buffer);
          });

          uploadedImages.push({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
        console.log(`Uploaded ${uploadedImages.length} images for review`);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue without images - don't block review submission
        uploadedImages = [];
      }
    }

    // Create review
    const review = new Review({
      orderId,
      productId,
      email: tokenData.email,
      rating,
      comment: sanitizedComment,
      images: uploadedImages, // ADD to Review Save
      status: 'pending' // Will be auto-approved if rating >= 4 and comment is good
    })

    await review.save()

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      reviewId: review._id,
      status: review.status
    })

  } catch (error) {
    console.error('Error submitting review:', error)
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Review already submitted for this product in this order'
      })
    }

    res.status(500).json({
      error: 'Failed to submit review. Please try again.'
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
 * GET /api/reviews/verify-token
 * Verify a review token and return order info
 */
router.get('/verify-token', verifyTokenLimit, async (req, res) => {
  try {
    const { token, orderId } = req.query

    if (!token || !orderId) {
      return res.status(400).json({
        error: 'Token and orderId are required'
      })
    }

    // Validate token
    const tokenValidation = validateReviewToken(token)
    if (!tokenValidation.valid) {
      return res.status(401).json({
        error: tokenValidation.error || 'Invalid or expired token'
      })
    }

    const tokenData = tokenValidation.data

    // Verify token matches order
    if (tokenData.orderId !== orderId) {
      return res.status(401).json({
        error: 'Token does not match this order'
      })
    }

    // Get order details
    const order = await Order.findOne({ 
      _id: orderId,
      status: { $regex: /^delivered$/i }
    }).populate('items.productId', 'name images').lean()

    if (!order) {
      return res.status(404).json({
        error: 'Order not found or not delivered'
      })
    }

    // Verify email matches order
    const orderEmail = order.guestInfo?.email || order.customer?.email
    if (!orderEmail || orderEmail.toLowerCase() !== tokenData.email.toLowerCase()) {
      return res.status(401).json({
        error: 'Email does not match order'
      })
    }

    // Check which products already have reviews
    const existingReviews = await Review.find({
      orderId,
      status: { $in: ['pending', 'approved'] }
    }).select('productId').lean()

    const reviewedProductIds = existingReviews.map(r => r.productId.toString())

    // Format products for review
    const availableProducts = order.items
      .filter(item => !reviewedProductIds.includes(item.productId._id.toString()))
      .map(item => ({
        productId: item.productId._id,
        name: item.name,
        image: item.image || item.productId?.images?.[0] || null,
        quantity: item.quantity,
        price: item.price
      }))

    res.json({
      valid: true,
      email: tokenData.email,
      order: {
        id: order._id,
        date: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status
      },
      products: availableProducts,
      alreadyReviewed: reviewedProductIds.length > 0
    })

  } catch (error) {
    console.error('Error verifying review token:', error)
    res.status(500).json({
      error: 'Failed to verify token'
    })
  }
})

/**
 * PATCH /api/reviews/:id/approve
 * Approve a review (admin only)
 */
router.patch('/:id/approve', protectAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      })
    }

    review.status = 'approved'
    review.moderatedBy = req.user.id
    review.moderatedAt = new Date()
    if (moderationNote) {
      review.moderationNote = moderationNote
    }

    await review.save()

    res.json({
      success: true,
      message: 'Review approved successfully',
      reviewId: review._id
    })

  } catch (error) {
    console.error('Error approving review:', error)
    res.status(500).json({
      error: 'Failed to approve review'
    })
  }
})

/**
 * PATCH /api/reviews/:id/reject
 * Reject a review (admin only)
 */
router.patch('/:id/reject', protectAdmin, async (req, res) => {
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
    review.moderatedBy = req.user.id
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
