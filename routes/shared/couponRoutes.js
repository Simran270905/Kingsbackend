import express from 'express'
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  validateCoupon,
  updateCoupon,
  deleteCoupon
} from '../controllers/shared/couponController.js'
import { protectAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post('/', protectAdmin, createCoupon)
router.get('/', getAllCoupons)
router.get('/:code', getCouponByCode)
router.post('/validate', validateCoupon)
router.put('/:id', protectAdmin, updateCoupon)
router.delete('/:id', protectAdmin, deleteCoupon)

export default router
