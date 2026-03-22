import express from 'express'
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  deleteAddress,
  getOrderHistory
} from '../controllers/userController.js'
import { protectCustomer } from '../middleware/customerAuth.js'
import { loginRateLimiter } from '../middleware/authMiddleware.js'
import { validateRegister, validateLogin } from '../middleware/validateRequest.js'

const router = express.Router()

// Public routes
router.post('/register', loginRateLimiter, validateRegister, register)
router.post('/login', loginRateLimiter, validateLogin, login)

// Protected routes (require authentication)
router.get('/profile', protectCustomer, getProfile)
router.put('/profile', protectCustomer, updateProfile)
router.post('/change-password', protectCustomer, changePassword)
router.get('/addresses', protectCustomer, getAddresses)
router.post('/addresses', protectCustomer, addAddress)
router.delete('/addresses/:addressIndex', protectCustomer, deleteAddress)
router.get('/orders', protectCustomer, getOrderHistory)

export default router
