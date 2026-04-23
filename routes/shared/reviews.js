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
    const { generateJWTReviewToken, generateReviewToken } = await import('../../utils/reviewToken.js')
    
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
router.post('/submit', submitReview)

// Protected routes
router.post('/product/:productId', authenticate, addProductReview)
router.delete('/product/:productId/:reviewId', authenticate, deleteReview)

export default router
