import express from 'express'
import { 
  getBrands, 
  getBrandById, 
  createBrand, 
  updateBrand, 
  deleteBrand 
} from '../../controllers/shared/shared/brandController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getBrands)
router.get('/:id', getBrandById)

// Protected routes
router.post('/', authenticate, createBrand)
router.put('/:id', authenticate, updateBrand)
router.delete('/:id', authenticate, deleteBrand)

export default router
