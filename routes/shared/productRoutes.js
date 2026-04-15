import express from 'express'
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  updateBestSellerStatus,
  updateSaleStatus,
  getBestSellers,
  getOnSaleProducts,
  getSimilarProducts,
  getRecentProducts
} from '../../controllers/shared/productController.js'
import { debugProductCategories } from '../../debug-products.js'
import { fixProductCategories } from '../../fix-product-categories.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getProducts)
router.get('/recent', getRecentProducts)
router.get('/stats', getProductStats)

router.get('/category/:category', getProductsByCategory)
router.get('/best-sellers', getBestSellers)
router.get('/on-sale', getOnSaleProducts)
router.get('/similar/:category/:id', getSimilarProducts)

// Debug endpoint (before /:id to prevent conflicts)
router.get('/debug-categories', debugProductCategories)

// Fix categories endpoint
router.post('/fix-categories', protectAdmin, fixProductCategories)

router.get('/:id', getProductById)

// Protected routes (admin only)
router.post('/', protectAdmin, createProduct)
router.put('/:id', protectAdmin, updateProduct)
router.delete('/:id', protectAdmin, deleteProduct)
router.patch('/:id/best-seller', protectAdmin, updateBestSellerStatus)
router.patch('/:id/sale-status', protectAdmin, updateSaleStatus)

export default router
