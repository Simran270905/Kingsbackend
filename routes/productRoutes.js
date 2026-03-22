import express from 'express'
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
} from '../controllers/productController.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getProducts)
router.get('/stats', getProductStats)
router.get('/category/:category', getProductsByCategory)
router.get('/:id', getProductById)

// Protected routes (admin only)
router.post('/', protectAdmin, createProduct)
router.put('/:id', protectAdmin, updateProduct)
router.delete('/:id', protectAdmin, deleteProduct)

export default router
