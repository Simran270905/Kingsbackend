import express from 'express'
import adminRoutes from './admin/index.js'
import customerRoutes from './customer/index.js'
import sharedRoutes from './shared/index.js'

const router = express.Router()

// Mount route groups
router.use('/admin', adminRoutes)
router.use('/customers', customerRoutes)
router.use('/', sharedRoutes)

export default router
