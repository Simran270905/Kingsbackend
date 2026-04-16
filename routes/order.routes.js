import express from 'express'
import { protectAdmin } from '../middleware/auth.js'
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  syncShiprocketStatus,
  exportOrders
} from '../controllers/shared/orderController.js'

const router = express.Router()

// Apply admin protection to all routes
router.use(protectAdmin)

// GET /api/admin/orders - Get all orders with pagination and filtering
router.get('/', getAllOrders)

// GET /api/admin/orders/:id - Get single order by ID
router.get('/:id', getOrderById)

// PATCH /api/admin/orders/:id/status - Update order status
router.patch('/:id/status', updateOrderStatus)

// POST /api/admin/orders/:id/sync-shiprocket - Sync Shiprocket status
router.post('/:id/sync-shiprocket', syncShiprocketStatus)

// GET /api/admin/orders/export - Export orders to CSV
router.get('/export', exportOrders)

export default router
