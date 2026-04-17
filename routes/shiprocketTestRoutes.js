import express from 'express';
import { testShiprocketIntegration, getTokenStatus } from '../services/shiprocketTestService.js';

const router = express.Router();

/**
 * POST /api/test-shiprocket
 * Test complete Shiprocket integration (login + order creation)
 */
router.post('/test-shiprocket', async (req, res) => {
  try {
    console.log('🧪 Shiprocket test endpoint called');
    
    // Run the complete test
    const result = await testShiprocketIntegration();
    
    // Return appropriate status based on result
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('💥 Shiprocket test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Shiprocket test',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/test-shiprocket/status
 * Get current Shiprocket token status
 */
router.get('/test-shiprocket/status', async (req, res) => {
  try {
    const status = getTokenStatus();
    res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Shiprocket status endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting token status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/test-shiprocket/login-only
 * Test only Shiprocket login (for debugging)
 */
router.post('/test-shiprocket/login-only', async (req, res) => {
  try {
    console.log('🔐 Shiprocket login-only test called');
    
    const { loginToShiprocket } = await import('../services/shiprocketTestService.js');
    const token = await loginToShiprocket();
    
    res.status(200).json({
      success: true,
      message: 'Shiprocket login successful',
      tokenReceived: !!token,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Shiprocket login-only test error:', error);
    res.status(400).json({
      success: false,
      message: 'Shiprocket login failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
