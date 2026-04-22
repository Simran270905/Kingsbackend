import express from 'express'
import jwt from 'jsonwebtoken'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../../controllers/admin/adminController.js'
import { getAllCustomers } from '../../controllers/customer/userController.js'
import { protectAdmin } from '../../middleware/auth.js'
import { getAdminAnalytics, validateRevenue } from '../../controllers/admin/adminAnalyticsController.js'
import { sendSuccess, sendError } from '../../middleware/errorHandler.js'
import orderRoutes from './enhancedOrderRoutes.js'
import analyticsRoutes from '../analytics.routes.js'
import Order, { default as OrderDefault } from '../../models/Order.js'
import { sendReviewEmail } from '../../services/reviewEmailService.js'

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
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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

// Manual review email sending
router.post('/send-review-email', protectAdmin, async (req, res) => {
  try {
    const { orderId, customerEmail, customerName } = req.body
    
    console.log('Sending review email request:', { orderId, customerEmail, customerName })
    
    if (!orderId || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId and customerEmail'
      })
    }
    
    // Find the order
    const order = await Order.findById(orderId).lean()
    
    if (!order) {
      console.error('Order not found:', orderId)
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }
    
    console.log('Found order:', {
      id: order._id,
      hasGuestInfo: !!order.guestInfo,
      guestEmail: order.guestInfo?.email,
      hasCustomer: !!order.customer,
      customerEmail: order.customer?.email
    })
    
    // Set deliveredAt if not already set
    if (!order.deliveredAt) {
      order.deliveredAt = new Date()
      await order.save()
      console.log('Set deliveredAt for order:', orderId)
    }
    
    // Ensure order has email for review email
    if (!order.guestInfo?.email && !order.customer?.email) {
      console.error('Order has no email address:', orderId)
      return res.status(400).json({
        success: false,
        error: 'Order has no customer email address'
      })
    }
    
    // Send review email
    console.log('Attempting to send review email...')
    const emailResult = await sendReviewEmail(order)
    
    if (emailResult) {
      console.log('Review email sent successfully')
      return res.json({
        success: true,
        message: `Review email sent successfully to ${customerEmail}`
      })
    } else {
      console.error('sendReviewEmail returned false')
      return res.status(500).json({
        success: false,
        error: 'Failed to send review email - check server logs for details'
      })
    }
    
  } catch (error) {
    console.error('Error sending manual review email:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      success: false,
      error: `Failed to send review email: ${error.message}`
    })
  }
})

// Mount detailed analytics routes for AdminReports component
router.use('/analytics', analyticsRoutes)

// New order routes
router.use('/orders', orderRoutes)

export default router
