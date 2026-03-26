import express from 'express'
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  validateCoupon,
  updateCoupon,
  deleteCoupon
} from '../../controllers/shared/couponController.js'
import { authenticateAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

router.post('/', authenticateAdmin, createCoupon)
router.get('/', getAllCoupons)
router.get('/:code', getCouponByCode)
router.post('/validate', validateCoupon)
router.put('/:id', authenticateAdmin, updateCoupon)
router.delete('/:id', authenticateAdmin, deleteCoupon)

export default router
