import express from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../../controllers/cartController.js'
import { protectCustomer } from '../../middleware/customerAuth.js'

const router = express.Router()

// All cart routes require authentication
router.get('/', protectCustomer, getCart)
router.post('/', protectCustomer, addToCart)
router.put('/:itemId', protectCustomer, updateCartItem)
router.delete('/:itemId', protectCustomer, removeFromCart)
router.delete('/', protectCustomer, clearCart)

export default router
