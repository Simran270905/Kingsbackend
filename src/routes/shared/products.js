import express from 'express'
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/shared/productController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getProducts)
router.get('/:id', getProductById)

// Protected routes
router.post('/', authenticate, createProduct)
router.put('/:id', authenticate, updateProduct)
router.delete('/:id', authenticate, deleteProduct)

export default router
