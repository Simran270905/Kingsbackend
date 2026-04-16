import express from 'express'
import {
  getAllOrdersEnhanced,
  getOrderDetailsEnhanced,
  markCODOrderAsPaidEnhanced,
  createOrderShipment,
  trackOrderShipment
} from '../../controllers/admin/enhancedOrderController.js'
import { protectAdmin } from '../../middleware/auth.js'

const router = express.Router()

// Enhanced order routes (admin only)
router.get('/enhanced', protectAdmin, getAllOrdersEnhanced)
router.get('/enhanced/:id', protectAdmin, getOrderDetailsEnhanced)
router.put('/enhanced/:id/mark-cod-paid', protectAdmin, markCODOrderAsPaidEnhanced)
router.post('/enhanced/:id/create-shipment', protectAdmin, createOrderShipment)
router.get('/enhanced/:id/track-shipment', protectAdmin, trackOrderShipment)

// Test endpoint
router.get('/test', protectAdmin, (req, res) => {
  res.json({ success: true, message: 'Enhanced order routes working!' })
})

export default router
