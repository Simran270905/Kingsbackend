import express from 'express'
import { 
  getContent, 
  saveContent, 
  getAllContent 
} from '../controllers/shared/shared/contentController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/type/:type', getContent)
router.get('/', getAllContent)

// Protected routes
router.post('/type/:type', authenticate, saveContent)

export default router
