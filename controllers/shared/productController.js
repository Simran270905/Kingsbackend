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
  console.log("✅ Products API HIT")
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
    .populate('category', 'name slug')
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
      .populate('category', 'name slug')
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
    originalPrice: parsedOriginalPrice,
    price: finalSellingPrice, 
    category, 
    images 
  })
  if (!validation.valid) {
    // Convert array of errors to object format for frontend
    const errorObject = validation.errors.reduce((acc, error) => {
      // Extract field name from error message
      if (error.includes('name')) acc.name = error
      else if (error.includes('description')) acc.description = error
      else if (error.includes('price') || error.includes('MRP')) acc.originalPrice = error
      else if (error.includes('category')) acc.category = error
      else if (error.includes('images')) acc.images = error
      else acc.general = error
      return acc
    }, {})
    
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errorObject
    })
  }

  // Validate pricing logic: selling price should never be greater than original price
  if (finalSellingPrice > parsedOriginalPrice) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: {
        sellingPrice: 'Selling price cannot be greater than MRP (original price)'
      }
    })
  }
  
  // Check for duplicate SKU
  if (sku) {
    const existing = await Product.findOne({ sku })
    if (existing) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: {
          sku: 'Product with this SKU already exists'
        }
      })
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
    isActive: true // FIXED: Ensure new products are active by default
  })
  
  await product.save()
  
  // DEBUG LOG: Verify prices are saved correctly
  console.log(' Product saved:', { 
    name: product.name, 
    purchasePrice: product.purchasePrice,
    originalPrice: product.originalPrice, 
    sellingPrice: product.sellingPrice 
  })
  
  // Return proper format for frontend sync
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product
  })
})

// UPDATE product
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params

  // STEP 1: FIX TYPE ISSUE (CRITICAL) - Convert ALL prices to numbers BEFORE validation
  const originalPrice = Number(req.body.originalPrice)
  const sellingPrice = Number(req.body.sellingPrice)
  const purchasePrice = Number(req.body.purchasePrice)

  // STEP 5: DEBUG LOG
  console.log("VALIDATION CHECK:", {
    originalPrice,
    sellingPrice,
    sellingPriceGreaterThanOriginal: sellingPrice > originalPrice
  })

  // STEP 2: REMOVED - Let Mongoose handle validation

  // Cloudinary: delete removed images
  if (req.body.images) {
    const existing = await Product.findById(id)
    if (existing && existing.images) {
      const removedImages = existing.images.filter(img => !req.body.images.includes(img))
      await deleteCloudinaryImages(removedImages)
    }
  }

  // STEP 3: ENSURE VALIDATION RUNS BEFORE UPDATE
  // Always get existing product for validation
  const existing = await Product.findById(id).populate('category brand')
  if (!existing) {
    return sendError(res, 'Product not found', 404)
  }
  
  // Build complete product data for validation
  const productData = {
    name: req.body.name || existing.name,
    description: req.body.description || existing.description,
    originalPrice: req.body.originalPrice || existing.originalPrice,
    sellingPrice: req.body.sellingPrice || existing.sellingPrice,
    purchasePrice: req.body.purchasePrice !== undefined ? req.body.purchasePrice : existing.purchasePrice,
    category: req.body.category || existing.category,
    images: req.body.images || existing.images,
    stock: req.body.stock !== undefined ? req.body.stock : existing.stock
  }
  
  // Only validate if any of the core fields are being updated
  const hasCoreFieldUpdates = req.body.name || req.body.description || req.body.category || req.body.images || req.body.originalPrice
  
  if (hasCoreFieldUpdates) {
    const validation = validateProduct(productData)
    if (!validation.valid) {
      console.log(" Validation error:", validation.errors)
      console.log(" Product data validated:", productData)
      
      // Convert array of errors to object format for frontend
      const errorObject = validation.errors.reduce((acc, error) => {
        if (error.includes('name')) acc.name = error
        else if (error.includes('description')) acc.description = error
        else if (error.includes('price') || error.includes('MRP')) {
          if (error.includes('original') || error.includes('MRP')) acc.originalPrice = error
          else acc.sellingPrice = error
        }
        else if (error.includes('category')) acc.category = error
        else if (error.includes('images')) acc.images = error
        else acc.general = error
        return acc
      }, {})
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errorObject
      })
    }
  }
  
  // STEP 6: FINAL UPDATE - Use req.body directly
  try {
    console.log('🔧 UPDATE DEBUG - Request body:', req.body)
    console.log('🔧 UPDATE DEBUG - Stock field:', {
      stockInBody: req.body.stock,
      stockType: typeof req.body.stock,
      hasSizes: req.body.hasSizes
    })
    
    console.log('About to call Product.findByIdAndUpdate with:', {
      id,
      updateData: req.body,
      options: { new: true, runValidators: true }
    })
    
    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!product) {
      return sendError(res, 'Product not found', 404)
    }
    
    console.log("✅ Product updated successfully:", {
      id: product._id,
      name: product.name,
      stock: product.stock,
      hasSizes: product.hasSizes,
      sizes: product.sizes
    })
    // Return proper format for frontend sync
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    })
  } catch (error) {
    console.log("â Update error:", error.message)
    console.log("â Error details:", error)
    return sendError(res, error.message || 'Failed to update product', 500)
  }
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
