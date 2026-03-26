import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

// Get cart
export const getCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.userId })
    .populate('items.productId', 'name price selling_price isOnSale discountPercentage images stock')
  
  if (!cart) {
    // Create empty cart if doesn't exist
    cart = await Cart.create({
      userId: req.user.userId,
      items: [],
      totalPrice: 0,
      itemCount: 0
    })
  }
  
  sendSuccess(res, cart)
})

// Add to cart
export const addToCart = catchAsync(async (req, res) => {
  const { productId, quantity, selectedSize } = req.body
  
  if (!productId || !quantity) {
    return sendError(res, 'Product ID and quantity are required', 400)
  }
  
  // Verify product exists
  const product = await Product.findById(productId)
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }
  
  // Check stock
  if (product.stock < quantity) {
    return sendError(res, 'Insufficient stock', 400)
  }
  
  let cart = await Cart.findOne({ userId: req.user.userId })
  
  if (!cart) {
    cart = new Cart({
      userId: req.user.userId,
      items: []
    })
  }
  
  // Check if item already in cart
  const existingItem = cart.items.find(
    item => 
      item.productId.toString() === productId && 
      item.selectedSize === selectedSize
  )
  
  // Calculate pricing
  const originalPrice = product.price
  const sellingPrice = product.selling_price || product.price
  const discountPercentage = product.discountPercentage || 0
  
  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.items.push({
      productId,
      name: product.name,
      price: sellingPrice,
      originalPrice,
      discountPercentage,
      isOnSale: product.isOnSale || false,
      quantity,
      selectedSize,
      image: product.images[0] || ''
    })
  }
  
  // Recalculate totals
  cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.totalPrice = cart.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  )
  
  await cart.save()
  
  sendSuccess(res, cart, 201, 'Item added to cart')
})

// Update cart item
export const updateCartItem = catchAsync(async (req, res) => {
  const { itemId, quantity } = req.body
  
  if (!itemId || !quantity) {
    return sendError(res, 'Item ID and quantity are required', 400)
  }
  
  if (quantity < 1) {
    return sendError(res, 'Quantity must be at least 1', 400)
  }
  
  const cart = await Cart.findOne({ userId: req.user.userId })
  
  if (!cart) {
    return sendError(res, 'Cart not found', 404)
  }
  
  const item = cart.items.id(itemId)
  
  if (!item) {
    return sendError(res, 'Item not found in cart', 404)
  }
  
  // Verify stock
  const product = await Product.findById(item.productId)
  if (product.stock < quantity) {
    return sendError(res, 'Insufficient stock', 400)
  }
  
  item.quantity = quantity
  
  // Recalculate totals
  cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  cart.totalPrice = cart.items.reduce(
    (sum, i) => sum + (i.price * i.quantity), 0
  )
  
  await cart.save()
  
  sendSuccess(res, cart, 200, 'Cart updated successfully')
})

// Remove from cart
export const removeFromCart = catchAsync(async (req, res) => {
  const { itemId } = req.params
  
  const cart = await Cart.findOne({ userId: req.user.userId })
  
  if (!cart) {
    return sendError(res, 'Cart not found', 404)
  }
  
  cart.items.pull(itemId)
  
  // Recalculate totals
  cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  cart.totalPrice = cart.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  )
  
  await cart.save()
  
  sendSuccess(res, cart, 200, 'Item removed from cart')
})

// Clear cart
export const clearCart = catchAsync(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { userId: req.user.userId },
    {
      items: [],
      itemCount: 0,
      totalPrice: 0
    },
    { new: true }
  )
  
  if (!cart) {
    return sendError(res, 'Cart not found', 404)
  }
  
  sendSuccess(res, cart, 200, 'Cart cleared successfully')
})
