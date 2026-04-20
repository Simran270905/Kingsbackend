import express from 'express'
import { protectAdmin } from '../middleware/auth.js'
import {
  getOrders,
  getOrderStats
} from '../controllers/shared/orderController.js'
import {
  getAdminAnalytics,
  validateRevenue
} from '../controllers/admin/adminAnalyticsController.js'
import { getSoldAnalytics, getAnalytics, triggerAnalyticsRefresh } from '../controllers/shared/analyticsController.js'

const router = express.Router()

// Apply admin protection to all routes
router.use(protectAdmin)

// GET /api/admin/analytics/summary - Get analytics summary
router.get('/summary', getAdminAnalytics)

// GET /api/admin/analytics/revenue-chart - Get revenue chart data
router.get('/revenue-chart', getAdminAnalytics)

// GET /api/admin/analytics/top-products - Get top selling products
router.get('/top-products', getAdminAnalytics)

// GET /api/admin/analytics/order-status-breakdown - Get order status breakdown
router.get('/order-status-breakdown', getAdminAnalytics)

// GET /api/admin/analytics/shipping-performance - Get shipping performance metrics
router.get('/shipping-performance', getOrderStats)

// GET /api/admin/analytics/sold - Get sold analytics from Orders (Single Source of Truth)
router.get('/sold', getSoldAnalytics)

// GET /api/admin/analytics - Get comprehensive analytics (REVAMPED)
router.get('/', getAnalytics)

// POST /api/admin/analytics/refresh - Trigger analytics refresh
router.post('/refresh', triggerAnalyticsRefresh)

export default router
