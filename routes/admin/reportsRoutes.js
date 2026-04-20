import express from 'express'
import { protectAdmin } from '../middleware/auth.js'
import {
  getReports,
  getReportsSummary,
  getSalesTrend,
  getCategoryDistribution,
  getOrdersChart,
  getExportData,
  triggerReportsRefresh
} from '../controllers/admin/reportsController.js'

const router = express.Router()

// Apply admin protection to all routes
router.use(protectAdmin)

// GET /api/admin/reports - Get comprehensive reports data
router.get('/', getReports)

// GET /api/admin/reports/summary - Get reports summary cards
router.get('/summary', getReportsSummary)

// GET /api/admin/reports/sales-trend - Get sales trend data
router.get('/sales-trend', getSalesTrend)

// GET /api/admin/reports/categories - Get category distribution
router.get('/categories', getCategoryDistribution)

// GET /api/admin/reports/orders-chart - Get orders status chart
router.get('/orders-chart', getOrdersChart)

// GET /api/admin/reports/export - Get export data (CSV/JSON)
router.get('/export', getExportData)

// POST /api/admin/reports/refresh - Trigger reports refresh
router.post('/refresh', triggerReportsRefresh)

export default router
