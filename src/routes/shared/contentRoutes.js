import express from 'express'
import {
  getContent,
  saveContent,
  getAllContent,
  deleteContent
} from '../../controllers/contentController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.get('/', getAllContent)
router.get('/:type', getContent)

// Protected routes (admin only)
router.put('/:type', protectAdmin, saveContent)
router.delete('/:type', protectAdmin, deleteContent)

export default router
