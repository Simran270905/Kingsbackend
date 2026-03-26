import express from 'express'
import { 
  getOrders, 
  getOrderById, 
  createOrder, 
  updateOrder, 
  deleteOrder,
  getUserOrders
} from '../../controllers/shared/orderController.js'
import { authenticate, protectCustomer } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getOrders)

// Customer specific routes (must come before /:id)
router.get('/my-orders', protectCustomer, getUserOrders)

router.get('/:id', getOrderById)

// Protected routes
router.post('/', authenticate, createOrder)
router.put('/:id', authenticate, updateOrder)
router.delete('/:id', authenticate, deleteOrder)

export default router
