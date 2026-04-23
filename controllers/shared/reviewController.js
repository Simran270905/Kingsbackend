import Product from '../../models/Product.js'
import User from '../../models/User.js'
import Order from '../../models/Order.js'
import { validateReviewToken } from '../../utils/reviewToken.js'

export const addProductReview = async (req, res) => {
  try {
    const { productId } = req.params
    const { userId, rating, comment } = req.body

    if (!userId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'User ID and rating are required'
      })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      })
    }

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      r => r.userId.toString() === userId.toString()
    )

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      })
    }

    // Add review
    const review = {
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      rating,
      comment: comment || '',
      createdAt: new Date()
    }

    product.reviews.push(review)

    // Recalculate average rating
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0)
    product.averageRating = totalRating / product.reviews.length
    product.totalReviews = product.reviews.length

    await product.save()

    res.status(201).json({
      success: true,
      data: review,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
      message: 'Review added successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10))

    // Validate productId
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      })
    }

    const product = await Product.findById(productId).select('reviews averageRating totalReviews')

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    // Get only approved reviews
    const approvedReviews = (product.reviews || []).filter(review => review.status === 'approved')
    
    // Calculate rating counts
    const ratingCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    approvedReviews.forEach(review => {
      const rating = review.rating.toString()
      if (ratingCounts[rating] !== undefined) {
        ratingCounts[rating]++
      }
    })

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedReviews = approvedReviews.slice(startIndex, endIndex)

    // Format reviews
    const formattedReviews = paginatedReviews.map(review => ({
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      verifiedPurchase: true,
      helpful: review.helpful || 0,
      displayName: review.customerName || review.userName || 'Anonymous',
      formattedDate: new Date(review.createdAt).toLocaleDateString(),
      createdAt: review.createdAt
    }))

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        averageRating: product.averageRating || 0,
        totalReviews: approvedReviews.length,
        ratingCounts
      },
      pagination: {
        page,
        limit,
        hasMore: endIndex < approvedReviews.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    const reviewIndex = product.reviews.findIndex(
      r => r._id.toString() === reviewId
    )

    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      })
    }

    product.reviews.splice(reviewIndex, 1)

    // Recalculate average rating
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0)
      product.averageRating = totalRating / product.reviews.length
      product.totalReviews = product.reviews.length
    } else {
      product.averageRating = 0
      product.totalReviews = 0
    }

    await product.save()

    res.json({
      success: true,
      message: 'Review deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const verifyReviewLink = async (req, res) => {
  try {
    const { orderId, token } = req.query;

    if (!orderId || !token) {
      return res.status(400).json({ valid: false, error: 'Order ID and token are required' });
    }

    // Use static import for token validation
    
    // Validate token
    const tokenValidation = validateReviewToken(token)
    if (!tokenValidation.valid) {
      return res.status(401).json({
        valid: false,
        error: tokenValidation.error || 'Invalid or expired token'
      })
    }

    const tokenData = tokenValidation.data

    // Verify token matches order
    if (tokenData.orderId !== orderId) {
      return res.status(401).json({
        valid: false,
        error: 'Token does not match this order'
      })
    }

    // Check if order exists
    const order = await Order.findOne({ 
      _id: orderId
    }).lean()

    if (!order) {
      return res.status(404).json({
        valid: false,
        error: 'Order not found',
        message: 'The specified order does not exist in the database',
        orderId: orderId,
        suggestion: 'Use a real order ID from the admin panel to test review functionality'
      })
    }

    // Verify email matches order
    const orderEmail = order.guestInfo?.email || order.customer?.email
    if (!orderEmail || orderEmail.toLowerCase() !== tokenData.email.toLowerCase()) {
      return res.status(401).json({
        valid: false,
        error: 'Email does not match order'
      })
    }

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
    
  } catch (error) {
    console.error('Error in verifyReviewLink endpoint:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({
      valid: false,
      error: 'Internal server error: ' + error.message
    })
  }
}

export const submitReview = async (req, res) => {
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

    // Use static import for token validation
    
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

    // Check if order exists
    const order = await Order.findOne({ 
      _id: orderId
    }).lean()

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
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

    // Import Review model
    const Review = await import('../models/Review.js')
    
    // Check for existing review
    const existingReview = await Review.default.findOne({ orderId, productId }).lean()
    if (existingReview) {
      return res.status(409).json({
        error: 'Review already submitted for this product in this order'
      })
    }

    // Sanitize comment
    const sanitizedComment = comment.trim().replace(/[<>]/g, '')

    // Create review
    const review = new Review.default({
      orderId,
      productId,
      email: tokenData.email,
      rating,
      comment: sanitizedComment,
      images: [], // Simplified - no images for now
      status: 'pending'
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
}
