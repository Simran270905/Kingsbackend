import express from 'express'
import { 
  getContent, 
  saveContent, 
  getAllContent 
} from '../../controllers/shared/contentController.js'
import { authenticate } from '../../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/:type', getContent)
router.get('/', getAllContent)

// Protected routes
router.post('/:type', authenticate, saveContent)

export default router
