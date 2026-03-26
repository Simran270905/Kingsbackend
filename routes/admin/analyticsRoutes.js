import express from 'express'
import {
  getAdminAnalytics,
  validateRevenue
} from '../../controllers/admin/adminAnalyticsController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Protected routes (admin only)
router.get('/', protectAdmin, getAdminAnalytics)
router.get('/validate-revenue', protectAdmin, validateRevenue)

export default router