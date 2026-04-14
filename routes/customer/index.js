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
// Guest checkout - no auth required
import { createCustomerOrder } from '../../controllers/customer/userController.js'

const router = express.Router()

// Guest checkout - no auth required
// Public order creation for guest checkout
router.post('/orders', createCustomerOrder) // Guest order creation - no auth required

// Remove all auth routes - guest checkout only
// router.get('/profile', protectCustomer, getProfile)
// router.put('/profile', protectCustomer, updateProfile)
// router.post('/change-password', protectCustomer, changePassword)
// router.get('/addresses', protectCustomer, getAddresses)
// router.post('/addresses', protectCustomer, addAddress)
// router.delete('/addresses/:addressIndex', protectCustomer, deleteAddress)
// router.get('/orders', protectCustomer, getOrderHistory)
// router.get('/orders/my-orders', protectCustomer, getOrderHistory) // Add this route for frontend compatibility

export default router
