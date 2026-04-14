import express from 'express'
import productRoutes from './productRoutes.js'
import categoryRoutes from './categories.js'
import brandRoutes from './brands.js'
import orderRoutes from './orderRoutes.js'
import paymentRoutes from './payments.js'
import uploadRoutes from './uploads.js'
import authRoutes from './auth.js'
import reviewRoutes from './reviews.js'
import couponRoutes from './coupons.js'
import contentRoutes from './content.js'
import contactRoutes from '../contactRoutes.js'

const router = express.Router()

// Mount all shared routes
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/brands', brandRoutes)
router.use('/orders', orderRoutes)
router.use('/payments', paymentRoutes)
router.use('/upload', uploadRoutes)
router.use('/auth', authRoutes)
router.use('/reviews', reviewRoutes)
router.use('/coupons', couponRoutes)
router.use('/content', contentRoutes)
router.use('/contact', contactRoutes)

export default router
