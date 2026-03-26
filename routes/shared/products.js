import express from 'express'
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getProductsByCategory,
  getProductStats
} from '../../controllers/shared/productController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes - order matters! Specific routes first
router.get('/stats', getProductStats)
router.get('/category/:category', getProductsByCategory)
router.get('/', getProducts)
router.get('/:id', getProductById)

// Protected routes
router.post('/', authenticate, createProduct)
router.put('/:id', authenticate, updateProduct)
router.delete('/:id', authenticate, deleteProduct)

export default router
