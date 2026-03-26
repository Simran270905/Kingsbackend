import express from 'express'
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/shared/categoryController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getCategories)
router.get('/:id', getCategoryById)

// Protected routes
router.post('/', authenticate, createCategory)
router.put('/:id', authenticate, updateCategory)
router.delete('/:id', authenticate, deleteCategory)

export default router
