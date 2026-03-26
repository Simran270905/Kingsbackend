import express from 'express'
import {
  addProductReview,
  getProductReviews,
  deleteReview
} from '../controllers/shared/reviewController.js'

const router = express.Router()

router.post('/:productId', addProductReview)
router.get('/:productId', getProductReviews)
router.delete('/:productId/:reviewId', deleteReview)

export default router
