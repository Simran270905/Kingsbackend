import express from 'express'
import { 
  getProductReviews, 
  addProductReview, 
  deleteReview,
  verifyReviewLink,
  submitReview
} from '../../controllers/shared/reviewController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/product/:productId', getProductReviews)
router.get('/verify', verifyReviewLink)
router.get('/verify-token', verifyReviewLink) // Add this for frontend compatibility
router.get('/debug-token', async (req, res) => {
  try {
    const { generateReviewToken } = await import('../../utils/reviewToken.js')
    const token = generateReviewToken('69e679bf0a9eb574729bbd7e', 'customer@example.com')
    res.json({
      success: true,
      token: token,
      secret: process.env.REVIEW_TOKEN_SECRET || 'DEFAULT_SECRET'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
router.post('/submit', submitReview)

// Protected routes
router.post('/product/:productId', authenticate, addProductReview)
router.delete('/product/:productId/:reviewId', authenticate, deleteReview)

export default router
