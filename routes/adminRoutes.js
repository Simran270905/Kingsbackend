import express from 'express'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../controllers/adminController.js'
import { getAllCustomers } from '../controllers/userController.js'
import { protectAdmin, loginRateLimiter } from '../middleware/authMiddleware.js'
import { getAdminAnalytics, validateRevenue } from '../controllers/adminAnalyticsController.js'

const router = express.Router()

// Temporarily remove rate limiter for debugging
router.post('/login', loginAdmin)
router.get('/verify', protectAdmin, verifyAdmin)
router.post('/logout', protectAdmin, logoutAdmin)
router.get('/customers', protectAdmin, getAllCustomers)

// Analytics endpoints
router.get('/analytics', protectAdmin, getAdminAnalytics)
router.get('/analytics/validate-revenue', protectAdmin, validateRevenue)

export default router
