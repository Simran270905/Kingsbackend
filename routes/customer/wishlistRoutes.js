import express from 'express'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../../controllers/customer/wishlistController.js'
import { protectCustomer } from '../../middleware/customerAuth.js'

const router = express.Router()

// All routes require customer authentication
router.use(protectCustomer)

router.get('/', getWishlist)
router.post('/', addToWishlist)
router.delete('/:productId', removeFromWishlist)
router.delete('/', clearWishlist)

export default router
