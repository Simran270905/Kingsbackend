import express from 'express'
import { 
  getProductReviews, 
  addProductReview, 
  deleteReview 
} from '../controllers/shared/reviewController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/product/:productId', getProductReviews)

// Protected routes
router.post('/product/:productId', authenticate, addProductReview)
router.delete('/product/:productId/:reviewId', authenticate, deleteReview)

export default router
