import express from 'express'
import {
  getOrders,
  getOrderById,
  getUserOrders,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getOrderStats,
  trackOrder,
  trackOrdersByPhone,
  getRemainingPayment,
  markRemainingPaymentAsPaid,
  updateOrderPayment,
  createShiprocketOrder,
  getShipmentTracking,
  retryShiprocketOrder
} from '../../controllers/shared/orderController.js'
import {
  markCODOrderAsPaid,
  getCODOrdersPendingPayment,
  getCODPaymentStats,
  markMultipleCODAsPaid
} from '../../controllers/shared/codController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'
import { protectCustomer } from '../../middleware/customerAuth.js'

const router = express.Router()

// Public routes
router.get('/stats', getOrderStats)

// Public order tracking (no authentication required)
router.get('/track/:orderId', trackOrder)
router.get('/track-by-phone', trackOrdersByPhone)
router.get('/orders/track-by-phone', trackOrdersByPhone)

// Remaining payment routes (admin only)
router.get('/:orderId/remaining-payment', protectAdmin, getRemainingPayment)
router.patch('/:orderId/remaining-payment', protectAdmin, markRemainingPaymentAsPaid)

// Customer routes (authenticated customers)
router.get('/my-orders', protectCustomer, getUserOrders)

// Public order creation (for guest checkout)
router.post('/', createOrder)

// COD-specific routes (admin only)
router.get('/cod/pending-payment', protectAdmin, getCODOrdersPendingPayment)
router.get('/cod/payment-stats', protectAdmin, getCODPaymentStats)
router.post('/cod/mark-multiple-paid', protectAdmin, markMultipleCODAsPaid)

// Payment update routes
router.patch('/:id/payment', updateOrderPayment)

// Shiprocket integration routes
router.post('/:id/shiprocket', createShiprocketOrder)
router.post('/:id/shiprocket/retry', protectAdmin, retryShiprocketOrder)
router.get('/:id/tracking', getShipmentTracking)

// Protected routes (admin only)
router.get('/', protectAdmin, getOrders)
router.get('/:id/track', protectCustomer, getOrderById) // Allow customers to track their orders
router.get('/:id', protectAdmin, getOrderById)
router.put('/:id/status', protectAdmin, updateOrderStatus)
router.put('/:id/mark-cod-paid', protectAdmin, markCODOrderAsPaid)
router.put('/:id', protectAdmin, updateOrder)
router.delete('/:id', protectAdmin, deleteOrder)

export default router