import express from 'express'
import adminRoutes from './admin/index.js'
import customerRoutes from './customer/index.js'
import sharedRoutes from './shared/index.js'
import shiprocketWebhookRoutes from './shiprocketWebhookRoutes.js'
import reviewRoutes from './reviewRoutes.js'

const router = express.Router()

// Shiprocket health check endpoint
router.get('/shiprocket/health', async (req, res) => {
  try {
    const shiprocketService = (await import('../services/shiprocketService.js')).default
    
    // Test by creating a simple order (will trigger authentication)
    const testOrder = {
      _id: 'health-check-' + Date.now(),
      items: [{
        name: 'Health Check Item',
        productId: 'health-check',
        price: 1,
        quantity: 1,
        subtotal: 1
      }],
      shippingAddress: {
        firstName: 'Health',
        lastName: 'Check',
        streetAddress: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        mobile: '9876543210',
        email: 'health@test.com'
      },
      paymentMethod: 'prepaid',
      totalAmount: 1,
      notes: 'Health check test'
    };
    
    const result = await shiprocketService.createOrder(testOrder);
    
    if (result && result.shipmentId) {
      res.json({
        status: 'ok',
        tokenAge: 'Freshly authenticated',
        tokenMaxAge: '216 hours',
        timestamp: new Date().toISOString(),
        shiprocketConnected: true,
        testShipmentId: result.shipmentId
      })
    } else {
      res.status(500).json({
        status: 'error',
        message: result?.error || 'Shiprocket connection failed',
        timestamp: new Date().toISOString(),
        shiprocketConnected: false
      })
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      shiprocketConnected: false
    })
  }
})

// Mount route groups
router.use('/admin', adminRoutes)
router.use('/customers', customerRoutes)
router.use('/', sharedRoutes)
router.use('/reviews', reviewRoutes)

export default router
