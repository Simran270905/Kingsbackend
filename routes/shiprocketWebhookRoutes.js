import express from 'express'
import { handleShiprocketWebhook } from '../controllers/shared/shiprocketWebhookController.js'

const router = express.Router()

// POST /api/payment/fulfillment/update - Handle Shiprocket webhook
// ✅ POST method only
// ✅ Token verification via x-api-key header
// ✅ Returns { received: true } immediately
router.post('/fulfillment/update', handleShiprocketWebhook)

// GET /api/payment/fulfillment/update - Browser testing endpoint
// ✅ Returns status for browser testing
router.get('/fulfillment/update', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Shiprocket webhook endpoint is working',
    method: 'POST',
    headers: {
      'x-api-key': 'Required (use kings_webhook_secret_2024)'
    },
    expectedPayload: {
      awb: 'string',
      current_status: 'string',
      order_id: 'string',
      channel_order_id: 'string',
      courier_name: 'string',
      current_timestamp: 'string',
      scans: 'array'
    }
  })
})

// POST /api/webhooks/shiprocket - Handle Shiprocket webhook for stock management
router.post('/webhooks/shiprocket', handleShiprocketWebhook)

// GET /api/webhooks/shiprocket/status/:orderId - Get webhook processing status
router.get('/webhooks/shiprocket/status/:orderId', (req, res) => {
  // This will be handled by the controller
  import('../controllers/shared/shiprocketWebhookController.js').then(({ getWebhookStatus }) => {
    getWebhookStatus(req, res)
  }).catch(error => {
    res.status(500).json({ error: 'Controller not found' })
  })
})

export default router
