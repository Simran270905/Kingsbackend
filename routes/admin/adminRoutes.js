import express from 'express'
import jwt from 'jsonwebtoken'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../../controllers/admin/adminController.js'
import { getAllCustomers } from '../controllers/userController.js'
import { protectAdmin, loginRateLimiter } from '../middleware/authMiddleware.js'
import { getAdminAnalytics, validateRevenue } from '../controllers/adminAnalyticsController.js'

const router = express.Router()

// Temporarily remove rate limiter for debugging
router.post('/login', loginAdmin)
router.get('/verify', protectAdmin, verifyAdmin)
router.post('/logout', protectAdmin, logoutAdmin)

// Debug endpoint to test admin credentials
router.post('/test-login', (req, res) => {
  const { password } = req.body
  const storedPassword = process.env.ADMIN_PASSWORD
  
  console.log('🔍 Admin login test')
  console.log('Submitted password:', password)
  console.log('Stored password:', storedPassword)
  
  const isMatch = password === storedPassword
  
  if (isMatch) {
    const token = jwt.sign(
      { role: 'admin', loginTime: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
    
    return res.status(200).json({
      success: true,
      message: 'Admin login test successful',
      data: { token, test: true }
    })
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin password'
    })
  }
})
router.get('/customers', protectAdmin, getAllCustomers)

// Analytics endpoints
router.get('/analytics', protectAdmin, getAdminAnalytics)
router.get('/analytics/validate-revenue', protectAdmin, validateRevenue)

export default router
