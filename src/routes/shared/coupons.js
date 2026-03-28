import express from 'express'
import { 
  getAllCoupons, 
  getCouponByCode, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon,
  validateCoupon 
} from '../controllers/shared/couponController.js'
import { protectAdmin } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getAllCoupons)
router.get('/code/:code', getCouponByCode)
router.post('/validate', validateCoupon)

// Admin only routes
router.post('/', protectAdmin, createCoupon)
router.put('/:id', protectAdmin, updateCoupon)
router.delete('/:id', protectAdmin, deleteCoupon)

export default router
