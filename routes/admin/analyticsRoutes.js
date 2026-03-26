import express from 'express'
import {
  getAnalytics,
  getProductAnalytics,
  getCustomerAnalytics
} from '../../controllers/analyticsController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Protected routes (admin only)
router.get('/', protectAdmin, getAnalytics)
router.get('/products', protectAdmin, getProductAnalytics)
router.get('/customers', protectAdmin, getCustomerAnalytics)

export default router