import express from 'express'
import jwt from 'jsonwebtoken'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../../controllers/admin/adminController.js'
import { getAllCustomers } from '../../controllers/customer/userController.js'
import { protectAdmin } from '../../middleware/auth.js'
import { getAdminAnalytics, validateRevenue } from '../../controllers/admin/adminAnalyticsController.js'
import { sendSuccess, sendError } from '../../middleware/errorHandler.js'
import orderRoutes from './enhancedOrderRoutes.js'

const router = express.Router()

// Admin authentication routes
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
    
    return sendSuccess(res, { token, test: true }, 200, 'Admin login test successful')
  } else {
    return sendError(res, 'Invalid admin password', 401)
  }
})

// Protected admin routes
router.get('/customers', protectAdmin, getAllCustomers)
router.get('/analytics', protectAdmin, getAdminAnalytics)
router.get('/analytics/validate-revenue', protectAdmin, validateRevenue)

// New order routes
router.use('/orders', orderRoutes)
// Note: analytics routes are already defined above

export default router
