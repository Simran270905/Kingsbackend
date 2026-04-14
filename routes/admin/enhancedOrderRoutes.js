import express from 'express'
import {
  getAllOrdersEnhanced,
  getOrderDetailsEnhanced,
  markCODOrderAsPaidEnhanced,
  createOrderShipment,
  trackOrderShipment,
  exportPaymentReports
} from '../controllers/enhancedOrderController.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Enhanced order routes (admin only)
router.get('/enhanced', protectAdmin, getAllOrdersEnhanced)
router.get('/enhanced/:id', protectAdmin, getOrderDetailsEnhanced)
router.put('/enhanced/:id/mark-cod-paid', protectAdmin, markCODOrderAsPaidEnhanced)
router.post('/enhanced/:id/create-shipment', protectAdmin, createOrderShipment)
router.get('/enhanced/:id/track-shipment', protectAdmin, trackOrderShipment)
router.get('/payment-reports/csv', protectAdmin, exportPaymentReports)

export default router
