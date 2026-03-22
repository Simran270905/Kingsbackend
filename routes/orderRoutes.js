import express from 'express'
import {
  getOrders,
  getOrderById,
  getUserOrders,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getOrderStats
} from '../controllers/orderController.js'
import { protectAdmin } from '../middleware/authMiddleware.js'
import { protectCustomer } from '../middleware/customerAuth.js'

const router = express.Router()

// Public routes
router.get('/stats', getOrderStats)

// Customer routes (authenticated customers)
router.get('/my-orders', protectCustomer, getUserOrders)

// Public order creation (for guest checkout)
router.post('/', createOrder)

// Protected routes (admin only)
router.get('/', protectAdmin, getOrders)
router.get('/:id', protectAdmin, getOrderById)
router.put('/:id/status', protectAdmin, updateOrderStatus)
router.put('/:id', protectAdmin, updateOrder)
router.delete('/:id', protectAdmin, deleteOrder)

export default router