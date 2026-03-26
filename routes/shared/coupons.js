import express from 'express'
import { 
  getAllCoupons, 
  getCouponByCode, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon 
} from '../../controllers/shared/shared/couponController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getAllCoupons)
router.get('/code/:code', getCouponByCode)

// Protected routes
router.post('/', authenticate, createCoupon)
router.put('/:id', authenticate, updateCoupon)
router.delete('/:id', authenticate, deleteCoupon)

export default router
