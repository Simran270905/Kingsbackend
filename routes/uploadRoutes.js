import express from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import { sendSuccess, sendError } from '../utils/errorHandler.js'
import { protectAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// Single image upload
router.post('/', protectAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file provided', 400)
    }
    
    const result = await cloudinary.v2.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'kkings-jewellery',
      },
      (error, result) => {
        if (error) {
          return sendError(res, 'Upload failed', 500)
        }
        
        sendSuccess(res, {
          url: result.secure_url,
          publicId: result.public_id
        }, 201, 'Upload successful')
      }
    ).end(req.file.buffer)
  } catch (error) {
    sendError(res, error.message || 'Upload failed', 500)
  }
})

// Multiple images upload
router.post('/multiple', protectAdmin, upload.array('images', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files provided', 400)
    }
    
    if (req.files.length > 4) {
      return sendError(res, 'Maximum 4 images allowed', 400)
    }
    
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        cloudinary.v2.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'kkings-jewellery',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve({
              url: result.secure_url,
              publicId: result.public_id
            })
          }
        ).end(file.buffer)
      })
    })
    
    const uploadedImages = await Promise.all(uploadPromises)
    
    sendSuccess(res, {
      images: uploadedImages,
      count: uploadedImages.length
    }, 201, 'Multiple uploads successful')
  } catch (error) {
    sendError(res, error.message || 'Upload failed', 500)
  }
})

// Delete image from Cloudinary
router.delete('/cloudinary', protectAdmin, async (req, res) => {
  try {
    const { publicId } = req.body
    if (!publicId) return sendError(res, 'publicId is required', 400)

    const result = await cloudinary.v2.uploader.destroy(publicId)
    if (result.result === 'ok' || result.result === 'not found') {
      return sendSuccess(res, { result }, 200, 'Image deleted from Cloudinary')
    }
    return sendError(res, 'Failed to delete image', 500)
  } catch (error) {
    sendError(res, error.message || 'Delete failed', 500)
  }
})

export default router