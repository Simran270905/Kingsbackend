import express from 'express'
import { handleShiprocketWebhook } from '../controllers/shiprocketWebhookController.js'

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

export default router
