import express from 'express'
import { protectAdmin } from '../middleware/auth.js'
import {
  getAnalyticsSummary,
  getRevenueChart,
  getTopProducts,
  getOrderStatusBreakdown,
  getShippingPerformance
} from '../controllers/order.controller.js'

const router = express.Router()

// Apply admin protection to all routes
router.use(protectAdmin)

// GET /api/admin/analytics/summary - Get analytics summary
router.get('/summary', getAnalyticsSummary)

// GET /api/admin/analytics/revenue-chart - Get revenue chart data
router.get('/revenue-chart', getRevenueChart)

// GET /api/admin/analytics/top-products - Get top selling products
router.get('/top-products', getTopProducts)

// GET /api/admin/analytics/order-status-breakdown - Get order status breakdown
router.get('/order-status-breakdown', getOrderStatusBreakdown)

// GET /api/admin/analytics/shipping-performance - Get shipping performance metrics
router.get('/shipping-performance', getShippingPerformance)

export default router
