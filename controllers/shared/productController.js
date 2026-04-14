import Product from '../../models/Product.js'
import cloudinary from 'cloudinary'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'
import { validateProduct } from '../../utils/validation.js'

// Simple in-memory cache for similar products
const similarProductsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

// Helper function to get cached similar products
const getCachedSimilarProducts = (category, productId) => {
  const cacheKey = `similar_${category}_${productId}`
  const cached = similarProductsCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  // Remove expired cache
  if (cached) {
    similarProductsCache.delete(cacheKey)
  }
  
  return null
}

// Helper function to set cached similar products
const setCachedSimilarProducts = (category, productId, data) => {
  const cacheKey = `similar_${category}_${productId}`
  similarProductsCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
  
  // Clean up old cache entries if cache gets too large
  if (similarProductsCache.size > 100) {
    const oldestKey = similarProductsCache.keys().next().value
    similarProductsCache.delete(oldestKey)
  }
}

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

// DEBUG: Get all products without filtering
export const getAllProductsDebug = catchAsync(async (req, res) => {
  try {
    const allProducts = await Product.find({})
      .select('name isActive category sellingPrice originalPrice createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
    
    const totalProducts = await Product.countDocuments()
    const activeProducts = await Product.countDocuments({ isActive: true })
    const inactiveProducts = await Product.countDocuments({ isActive: false })
    const undefinedProducts = await Product.countDocuments({ isActive: { $exists: false } })
    
    console.log('🔍 DEBUG - Product counts:', {
      total: totalProducts,
      active: activeProducts,
      inactive: inactiveProducts,
      undefined: undefinedProducts
    })
    
    res.json({
      success: true,
      data: {
        products: allProducts,
        counts: {
          total: totalProducts,
          active: activeProducts,
          inactive: inactiveProducts,
          undefined: undefinedProducts
        }
      }
    })
  } catch (error) {
    console.error('❌ DEBUG endpoint error:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET all products with filters
export const getProducts = catchAsync(async (req, res) => {
  const { category, search, page = 1, limit = 100, bestSeller, onSale } = req.query
  
  // ✅ FIXED: Include products without isActive field and treat null/undefined as active
  let query = { 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } },
      { isActive: null },
      { isActive: { $ne: false } }
    ]
  }
  
  if (category) {
    query.category = category
  }
  
  if (bestSeller === 'true') {
    query.isBestSeller = true
  }
  
  if (onSale === 'true') {
    query.isOnSale = true
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
    .maxTimeMS(5000) // ✅ FIXED: Add 5 second timeout to prevent hanging
  
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
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
  
  sendSuccess(res, products)
})

// GET recent products (for dashboard)
export const getRecentProducts = catchAsync(async (req, res) => {
  const { limit = 5 } = req.query
  
  try {
    const products = await Product.find()
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .maxTimeMS(5000)
    
    sendSuccess(res, products)
  } catch (error) {
    console.error("Recent products error:", error)
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch recent products" 
    })
  }
})

// CREATE product
export const createProduct = catchAsync(async (req, res) => {
  const { 
    name, 
    description, 
    price, 
    sellingPrice, 
    selling_price, 
    originalPrice, 
    purchasePrice,
    category, 
    brand, 
    images, 
    stock, 
    sku,
    hasSizes,
    sizes,
    material,
    purity,
    weight,
    isBestSeller,
    isOnSale,
    discountPercentage
  } = req.body
  
  // ✅ FIXED: Parse prices correctly with fallback to 0
  const parsedPurchasePrice = parseFloat(purchasePrice) || 0
  const parsedOriginalPrice = parseFloat(originalPrice) || 0
  const finalSellingPrice = parseFloat(sellingPrice || selling_price || price) || 0
  
  // Validate input
  const validation = validateProduct({ 
    name, 
    description, 
    price: finalSellingPrice, 
    category, 
    images 
  })
  if (!validation.valid) {
    return sendError(res, 'Validation failed', 400, validation.errors)
  }

  // Validate pricing logic: selling price should never be greater than original price
  if (finalSellingPrice > parsedOriginalPrice) {
    return sendError(res, 'Selling price cannot be greater than MRP (original price)', 400)
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
    originalPrice: parsedOriginalPrice,
    sellingPrice: finalSellingPrice, // ✅ FIXED: Use consistent field name
    purchasePrice: parsedPurchasePrice, // ✅ FIXED: Add purchasePrice
    category,
    brand: brand || null,
    images: images || [],
    stock: stock || 1,
    sku,
    hasSizes: hasSizes || false,
    sizes: sizes || [],
    material: material || 'Gold',
    purity: purity || null,
    weight: weight ? Number(weight) : null,
    isBestSeller: isBestSeller || false,
    isOnSale: isOnSale || false,
    discountPercentage: discountPercentage || 0,
    isActive: true // ✅ FIXED: Ensure new products are active by default
  })
  
  await product.save()
  
  // ✅ DEBUG LOG: Verify prices are saved correctly
  console.log('✅ Product saved:', { 
    name: product.name, 
    purchasePrice: product.purchasePrice,
    originalPrice: product.originalPrice, 
    sellingPrice: product.sellingPrice 
  })
  
  sendSuccess(res, product, 201, 'Product created successfully')
})

// UPDATE product
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params
  const updates = req.body

  // ✅ FIXED: Handle both camelCase and snake_case for sellingPrice
  if (updates.sellingPrice || updates.selling_price) {
    updates.sellingPrice = updates.sellingPrice || updates.selling_price
    delete updates.selling_price // Remove snake_case version
  }

  // Cloudinary: delete removed images
  if (updates.images) {
    const existing = await Product.findById(id)
    if (existing && existing.images) {
      const removedImages = existing.images.filter(img => !updates.images.includes(img))
      await deleteCloudinaryImages(removedImages)
    }
  }
  
  // Validate product data if provided
  if (updates.name || updates.description || updates.sellingPrice || updates.category || updates.images) {
    const existing = await Product.findById(id)
    if (!existing) {
      return sendError(res, 'Product not found', 404)
    }
    
    const productData = {
      name: updates.name || existing.name,
      description: updates.description || existing.description,
      sellingPrice: updates.sellingPrice || existing.sellingPrice,
      category: updates.category || existing.category,
      images: updates.images || existing.images
    }
    
    const validation = validateProduct(productData)
    if (!validation.valid) {
      return sendError(res, 'Validation failed', 400, validation.errors)
    }

    // Validate pricing logic: selling price should never be greater than original price
    const finalSellingPrice = updates.sellingPrice || existing.sellingPrice
    const finalOriginalPrice = existing.originalPrice
    if (finalSellingPrice > finalOriginalPrice) {
      return sendError(res, 'Selling price cannot be greater than MRP (original price)', 400)
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
  const totalProducts = await Product.countDocuments({ 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
  const lowStockProducts = await Product.countDocuments({ 
    stock: { $lt: 5 },
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
  const categories = await Product.distinct('category')
  const bestSellers = await Product.countDocuments({ 
    isBestSeller: true, 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
  const onSaleProducts = await Product.countDocuments({ 
    isOnSale: true, 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
  
  const avgPrice = await Product.aggregate([
    { 
      $match: { 
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      } 
    },
    { $group: { _id: null, avgPrice: { $avg: '$sellingPrice' } } } // ✅ FIXED: Use sellingPrice
  ])
  
  sendSuccess(res, {
    totalProducts,
    lowStockProducts,
    categories,
    bestSellers,
    onSaleProducts,
    avgPrice: avgPrice[0]?.avgPrice || 0
  })
})

// UPDATE product best seller status
export const updateBestSellerStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { isBestSeller } = req.body

  const product = await Product.findByIdAndUpdate(
    id,
    { isBestSeller },
    { new: true, runValidators: true }
  )
  
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }
  
  sendSuccess(res, product, 200, `Product ${isBestSeller ? 'marked as' : 'unmarked as'} best seller`)
})

// UPDATE product sale status
export const updateSaleStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { isOnSale, discountPercentage, selling_price, sellingPrice } = req.body

  const updateData = { isOnSale }
  
  if (isOnSale) {
    // ✅ FIXED: Handle both camelCase and snake_case
    const finalSellingPrice = sellingPrice || selling_price
    
    if (discountPercentage && discountPercentage > 0) {
      updateData.discountPercentage = discountPercentage
      // Calculate selling price based on discount percentage
      const product = await Product.findById(id)
      if (product) {
        updateData.sellingPrice = product.originalPrice * (1 - discountPercentage / 100)
      }
    } else if (finalSellingPrice && finalSellingPrice > 0) {
      updateData.sellingPrice = finalSellingPrice
      // Calculate discount percentage
      const product = await Product.findById(id)
      if (product) {
        updateData.discountPercentage = Math.round(((product.originalPrice - finalSellingPrice) / product.originalPrice) * 100)
      }
    }
  } else {
    updateData.discountPercentage = 0
    updateData.sellingPrice = null
  }

  const product = await Product.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  )
  
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }
  
  sendSuccess(res, product, 200, `Product ${isOnSale ? 'marked as' : 'unmarked as'} on sale`)
})

// GET best sellers
export const getBestSellers = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query
  
  const products = await Product.find({ 
    isBestSeller: true, 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
    .limit(parseInt(limit))
    .sort({ salesCount: -1, createdAt: -1 })
  
  sendSuccess(res, products)
})

// GET on sale products
export const getOnSaleProducts = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query
  
  const products = await Product.find({ 
    isOnSale: true, 
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
    .limit(parseInt(limit))
    .sort({ discountPercentage: -1, createdAt: -1 })
  
  sendSuccess(res, products)
})

// GET similar products - OPTIMIZED FOR FAST LOADING WITH CACHE
export const getSimilarProducts = catchAsync(async (req, res) => {
  const { category, id } = req.params
  const { limit = 6 } = req.query
  
  // Validate required parameters
  if (!category || !id) {
    return sendError(res, 'Category and product ID are required', 400)
  }
  
  // Check cache first
  const cachedProducts = getCachedSimilarProducts(category, id)
  if (cachedProducts) {
    console.log('Cache hit for similar products:', category)
    return sendSuccess(res, cachedProducts)
  }
  
  console.log('Cache miss, fetching from database:', category)
  
  // Optimized query: only essential fields, limit results, exclude current product
  const products = await Product.find({
    category,
    _id: { $ne: id }, // Exclude current product
    $or: [
      { isActive: true },
      { isActive: { $exists: false } }
    ]
  })
    .select('name sellingPrice originalPrice images category') // Only essential fields
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .maxTimeMS(3000) // 3 second timeout
  
  // Cache the results
  setCachedSimilarProducts(category, id, products)
  
  sendSuccess(res, products)
})
