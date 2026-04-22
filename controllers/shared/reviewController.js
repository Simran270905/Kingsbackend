import Product from '../../models/Product.js'
import User from '../../models/User.js'
import Order from '../../models/Order.js'

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
      return res.status(400).json({ valid: false });
    }

    const order = await Order.findById(orderId);

    if (!order || order.reviewToken !== token) {
      return res.status(401).json({ valid: false });
    }

    const productId = order.items?.[0]?.product;

    if (!productId) {
      return res.status(404).json({ valid: false });
    }

    return res.json({
      valid: true,
      productId,
      orderId,
    });
  } catch (err) {
    return res.status(500).json({ valid: false });
  }
}

export const submitReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body;
    
    if (!orderId || !productId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Order ID, Product ID, and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    // Verify order exists and has review token
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Handle image uploads if any
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }

    // Create review object
    const review = {
      orderId,
      productId,
      rating: parseInt(rating),
      comment: comment || '',
      images,
      customerName: order.guestInfo ? 
        `${order.guestInfo.firstName} ${order.guestInfo.lastName}`.trim() : 
        'Anonymous',
      customerEmail: order.guestInfo?.email || '',
      status: 'pending', // Pending admin approval
      createdAt: new Date()
    };

    // Add review to product
    if (!product.reviews) {
      product.reviews = [];
    }
    product.reviews.push(review);

    // Recalculate average rating (only for approved reviews)
    const approvedReviews = product.reviews.filter(r => r.status === 'approved');
    if (approvedReviews.length > 0) {
      const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
      product.averageRating = totalRating / approvedReviews.length;
    } else {
      product.averageRating = 0;
    }
    product.totalReviews = approvedReviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully! It will be visible after approval.'
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
}
