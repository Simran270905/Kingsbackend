import express from 'express'
import { 
  getOrders, 
  getOrderById, 
  createOrder, 
  updateOrder, 
  deleteOrder 
} from '../../controllers/shared/orderController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getOrders)
router.get('/:id', getOrderById)

// Protected routes
router.post('/', authenticate, createOrder)
router.put('/:id', authenticate, updateOrder)
router.delete('/:id', authenticate, deleteOrder)

export default router
