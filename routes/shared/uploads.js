import express from 'express'
import { uploadImage, uploadImages, deleteImage, upload } from '../controllers/shared/shared/uploadController.js'
import { protectAdmin } from '../middleware/auth.js'

const router = express.Router()

// Single image upload
router.post('/', protectAdmin, upload.single('image'), uploadImage)

// Multiple images upload
router.post('/multiple', protectAdmin, upload.array('images', 4), uploadImages)

// Delete image from Cloudinary
router.delete('/cloudinary', protectAdmin, deleteImage)

export default router
