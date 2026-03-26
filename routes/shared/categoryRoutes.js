import express from 'express'
import {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../controllers/categoryController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Admin only (must be before /:id to avoid route shadowing)
router.get('/admin/all', protectAdmin, getAllCategoriesAdmin)

// Public
router.get('/', getCategories)
router.get('/:id', getCategoryById)

// Admin mutations
router.post('/', protectAdmin, createCategory)
router.put('/:id', protectAdmin, updateCategory)
router.delete('/:id', protectAdmin, deleteCategory)

export default router
