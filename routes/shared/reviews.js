import express from 'express'
import { 
  getProductReviews, 
  addProductReview, 
  deleteReview 
} from '../../controllers/shared/reviewController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/product/:productId', getProductReviews)
router.get('/:productId', getProductReviews) // Add this to match frontend calls

// Protected routes
router.post('/product/:productId', authenticate, addProductReview)
router.post('/:productId', authenticate, addProductReview) // Add this to match frontend calls
router.delete('/product/:productId/:reviewId', authenticate, deleteReview)
router.delete('/:productId/:reviewId', authenticate, deleteReview) // Add this to match frontend calls

export default router
