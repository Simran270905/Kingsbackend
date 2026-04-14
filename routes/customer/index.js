import express from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  deleteAddress,
  getOrderHistory,
  register,
  login,
  createCustomerOrder
} from '../../controllers/customer/userController.js'
import { protectCustomer } from '../../middleware/auth.js'
import { loginRateLimiter } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.post('/register', register)
router.post('/login', loginRateLimiter, login)

// Protected routes (require authentication)
router.get('/profile', protectCustomer, getProfile)
router.put('/profile', protectCustomer, updateProfile)
router.post('/change-password', protectCustomer, changePassword)
router.get('/addresses', protectCustomer, getAddresses)
router.post('/addresses', protectCustomer, addAddress)
router.delete('/addresses/:addressIndex', protectCustomer, deleteAddress)
router.get('/orders', protectCustomer, getOrderHistory)
router.get('/orders/my-orders', protectCustomer, getOrderHistory) // Add this route for frontend compatibility
router.post('/orders', protectCustomer, createCustomerOrder) // Protected order creation

export default router
