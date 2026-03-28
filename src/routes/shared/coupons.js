import express from 'express'
import { 
  getAllCoupons, 
  getCouponByCode, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon,
  validateCoupon 
} from '../../controllers/shared/couponController.js'
import { protectAdmin } from '../../middleware/auth.js'

const router = express.Router()

console.log('🔧 DEBUG: Coupon routes loaded')

// ✅ ADDED: Simple test route
router.get('/test', (req, res) => {
  console.log('🔍 DEBUG: GET /coupons/test route hit')
  res.json({
    success: true,
    message: 'Coupon routes are working!',
    timestamp: new Date().toISOString()
  })
})

// Public routes
router.get('/', (req, res, next) => {
  console.log('🔍 DEBUG: GET /coupons route hit')
  getAllCoupons(req, res, next)
})

router.get('/code/:code', (req, res, next) => {
  console.log('🔍 DEBUG: GET /coupons/code/:code route hit with code:', req.params.code)
  getCouponByCode(req, res, next)
})

router.post('/validate', (req, res, next) => {
  console.log('🔍 DEBUG: POST /coupons/validate route hit')
  console.log('🔍 DEBUG: Request body:', req.body)
  console.log('🔍 DEBUG: Request headers:', req.headers)
  validateCoupon(req, res, next)
})

// Admin only routes
router.post('/', (req, res, next) => {
  console.log('🔍 DEBUG: POST /coupons (admin) route hit')
  protectAdmin(req, res, next)
})

router.put('/:id', (req, res, next) => {
  console.log('🔍 DEBUG: PUT /coupons/:id route hit with id:', req.params.id)
  protectAdmin(req, res, next)
})

router.delete('/:id', (req, res, next) => {
  console.log('🔍 DEBUG: DELETE /coupons/:id route hit with id:', req.params.id)
  protectAdmin(req, res, next)
})

console.log('🔧 DEBUG: All coupon routes registered')
export default router
