import express from 'express'
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  deleteAddress,
  getOrderHistory
} from '../controllers/userController.js'
import { protectCustomer } from '../middleware/customerAuth.js'

const router = express.Router()

// Note: Authentication is handled via OTP routes at /api/otp
// These routes are for authenticated users only

// Protected routes (require authentication)
router.get('/profile', protectCustomer, getProfile)
router.put('/profile', protectCustomer, updateProfile)
router.post('/change-password', protectCustomer, changePassword)
router.get('/addresses', protectCustomer, getAddresses)
router.post('/addresses', protectCustomer, addAddress)
router.delete('/addresses/:addressIndex', protectCustomer, deleteAddress)
router.get('/orders', protectCustomer, getOrderHistory)

export default router
