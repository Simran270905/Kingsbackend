import express from 'express'
import {
  getBrands,
  getAllBrandsAdmin,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
} from '../controllers/brandController.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin only (must be before /:id to avoid route shadowing)
router.get('/admin/all', protectAdmin, getAllBrandsAdmin)

// Public
router.get('/', getBrands)
router.get('/:id', getBrandById)

// Admin mutations
router.post('/', protectAdmin, createBrand)
router.put('/:id', protectAdmin, updateBrand)
router.delete('/:id', protectAdmin, deleteBrand)

export default router
