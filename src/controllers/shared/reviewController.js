import Product from '../models/Product.js'
import User from '../models/User.js'

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
    const product = await Product.findById(productId).select('reviews averageRating totalReviews')

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      })
    }

    res.json({
      success: true,
      data: {
        reviews: product.reviews,
        averageRating: product.averageRating,
        totalReviews: product.totalReviews
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
