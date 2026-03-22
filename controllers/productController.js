import Product from '../models/Product.js'
import cloudinary from 'cloudinary'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'
import { validateProduct } from '../utils/validation.js'

const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary')) return null
  const parts = url.split('/')
  const fileWithExt = parts[parts.length - 1]
  const file = fileWithExt.split('.')[0]
  const folder = parts[parts.length - 2]
  return `${folder}/${file}`
}

const deleteCloudinaryImages = async (images = []) => {
  for (const url of images) {
    const publicId = extractPublicId(url)
    if (publicId) {
      try {
        await cloudinary.v2.uploader.destroy(publicId)
      } catch (e) {
      }
    }
  }
}

// GET all products with filters
export const getProducts = catchAsync(async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query
  
  let query = { isActive: true }
  
  if (category) {
    query.category = category
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ]
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const products = await Product.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
  
  const total = await Product.countDocuments(query)
  
  sendSuccess(res, {
    products,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

// GET single product by ID
export const getProductById = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id)
  
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }
  
  sendSuccess(res, product)
})

// GET products by category
export const getProductsByCategory = catchAsync(async (req, res) => {
  const { category } = req.params
  const { limit = 10 } = req.query
  
  const products = await Product.find({ 
    category,
    isActive: true 
  })
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
  
  sendSuccess(res, products)
})

// CREATE product
export const createProduct = catchAsync(async (req, res) => {
  const { name, description, price, selling_price, category, brand, images, stock, sku } = req.body
  
  // Validate input
  const validation = validateProduct({ name, description, price, category, images })
  if (!validation.valid) {
    return sendError(res, 'Validation failed', 400, validation.errors)
  }
  
  // Check for duplicate SKU
  if (sku) {
    const existing = await Product.findOne({ sku })
    if (existing) {
      return sendError(res, 'Product with this SKU already exists', 400)
    }
  }
  
  const product = new Product({
    name,
    description,
    price,
    selling_price,
    category,
    brand: brand || null,
    images: images || [],
    stock: stock || 1,
    sku
  })
  
  await product.save()
  
  sendSuccess(res, product, 201, 'Product created successfully')
})

// UPDATE product
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params
  const updates = req.body

  // Cloudinary: delete removed images
  if (updates.images) {
    const existing = await Product.findById(id)
    if (existing && existing.images) {
      const removedImages = existing.images.filter(img => !updates.images.includes(img))
      await deleteCloudinaryImages(removedImages)
    }
  }
  
  // Validate product data if provided
  if (updates.name || updates.description || updates.price || updates.category || updates.images) {
    const existing = await Product.findById(id)
    if (!existing) {
      return sendError(res, 'Product not found', 404)
    }
    
    const productData = {
      name: updates.name || existing.name,
      description: updates.description || existing.description,
      price: updates.price || existing.price,
      category: updates.category || existing.category,
      images: updates.images || existing.images
    }
    
    const validation = validateProduct(productData)
    if (!validation.valid) {
      return sendError(res, 'Validation failed', 400, validation.errors)
    }
  }
  
  const product = await Product.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  )
  
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }
  
  sendSuccess(res, product, 200, 'Product updated successfully')
})

// DELETE product
export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params

  const product = await Product.findById(id)
  if (!product) return sendError(res, 'Product not found', 404)

  // Delete all product images from Cloudinary
  await deleteCloudinaryImages(product.images || [])

  await Product.findByIdAndDelete(id)
  sendSuccess(res, null, 200, 'Product deleted successfully')
})

// GET product statistics
export const getProductStats = catchAsync(async (req, res) => {
  const totalProducts = await Product.countDocuments({ isActive: true })
  const lowStockProducts = await Product.countDocuments({ 
    stock: { $lt: 5 },
    isActive: true 
  })
  const categories = await Product.distinct('category')
  
  const avgPrice = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, avgPrice: { $avg: '$price' } } }
  ])
  
  sendSuccess(res, {
    totalProducts,
    lowStockProducts,
    categories,
    avgPrice: avgPrice[0]?.avgPrice || 0
  })
})
