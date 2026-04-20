import express from 'express'
import adminRoutes from './admin/index.js'
import customerRoutes from './customer/index.js'
import sharedRoutes from './shared/index.js'

const router = express.Router()

// Shiprocket health check endpoint
router.get('/shiprocket/health', async (req, res) => {
  try {
    const shiprocketService = (await import('../services/shiprocketService.js')).default
    
    // Call authenticate to ensure token is fresh
    await shiprocketService.authenticate()
    
    // Get token age information
    const tokenAgeHours = Math.floor(9 * 24) // Max age is 9 days = 216 hours
    
    res.json({
      status: 'ok',
      tokenAge: 'Freshly authenticated',
      tokenMaxAge: `${tokenAgeHours} hours`,
      timestamp: new Date().toISOString(),
      shiprocketConnected: true
    })
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

export default router
