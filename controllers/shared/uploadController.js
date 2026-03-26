import cloudinary from 'cloudinary'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'
import multer from 'multer'

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
export const uploadImage = catchAsync(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file provided', 400)
  }
  
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return sendError(res, 'Cloudinary is not configured', 500)
  }
  
  // Convert buffer to base64 for upload
  const b64 = Buffer.from(req.file.buffer).toString('base64')
  let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64
  
  const result = await cloudinary.v2.uploader.upload(dataURI, {
    resource_type: 'auto',
    folder: 'kkings-jewellery',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 800, height: 800, crop: 'limit' }
    ]
  })
  
  sendSuccess(res, {
    url: result.secure_url,
    publicId: result.public_id,
    originalName: req.file.originalname,
    size: result.bytes,
    format: result.format
  }, 201, 'Upload successful')
})

// Multiple images upload
export const uploadImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 'No files provided', 400)
  }
  
  if (req.files.length > 4) {
    return sendError(res, 'Maximum 4 images allowed', 400)
  }
  
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return sendError(res, 'Cloudinary is not configured', 500)
  }
  
  const uploadPromises = req.files.map(async (file, index) => {
    try {
      // Convert buffer to base64 for upload
      const b64 = Buffer.from(file.buffer).toString('base64')
      let dataURI = 'data:' + file.mimetype + ';base64,' + b64
      
      const result = await cloudinary.v2.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'kkings-jewellery',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 800, height: 800, crop: 'limit' }
        ]
      })
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        size: result.bytes,
        format: result.format,
        index: index
      }
    } catch (error) {
      console.error(`Error uploading file ${index}:`, error)
      throw new Error(`Failed to upload ${file.originalname}: ${error.message}`)
    }
  })
  
  const uploadedImages = await Promise.all(uploadPromises)
  
  sendSuccess(res, {
    images: uploadedImages,
    count: uploadedImages.length
  }, 201, 'Multiple uploads successful')
})

// Delete image from Cloudinary
export const deleteImage = catchAsync(async (req, res) => {
  const { publicId } = req.body
  if (!publicId) return sendError(res, 'publicId is required', 400)

  const result = await cloudinary.v2.uploader.destroy(publicId)
  if (result.result === 'ok' || result.result === 'not found') {
    return sendSuccess(res, { result }, 200, 'Image deleted from Cloudinary')
  }
  return sendError(res, 'Failed to delete image', 500)
})

export { upload }
