import express from 'express'
import productRoutes from './products.js'
import categoryRoutes from './categories.js'
import brandRoutes from './brands.js'
import orderRoutes from './orders.js'
import paymentRoutes from './payments.js'
import uploadRoutes from './uploads.js'
import otpRoutes from './otp.js'
import authRoutes from './auth.js'
import directAuthRoutes from './directAuthRoutes.js'
import reviewRoutes from './reviews.js'
import couponRoutes from './coupons.js'
import contentRoutes from './content.js'
import healthRoutes from './health.js'

const router = express.Router()

// Mount all shared routes
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/brands', brandRoutes)
router.use('/orders', orderRoutes)
router.use('/payments', paymentRoutes)
router.use('/upload', uploadRoutes)
router.use('/otp', otpRoutes)
router.use('/auth', authRoutes)
router.use('/auth', directAuthRoutes) // Direct login without OTP
router.use('/reviews', reviewRoutes)
router.use('/coupons', couponRoutes)
router.use('/content', contentRoutes)
router.use('/health', healthRoutes) // Health check endpoints

export default router
