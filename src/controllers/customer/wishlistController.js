import Wishlist from '../../models/Wishlist.js'
import Product from '../../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

// GET user's wishlist
export const getWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id

  let wishlist = await Wishlist.findOne({ userId }).populate('products.productId')

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, products: [] })
  }

  sendSuccess(res, wishlist)
})

// ADD product to wishlist
export const addToWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id
  const { productId } = req.body

  if (!productId) {
    return sendError(res, 'Product ID is required', 400)
  }

  const product = await Product.findById(productId)
  if (!product) {
    return sendError(res, 'Product not found', 404)
  }

  let wishlist = await Wishlist.findOne({ userId })

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId, products: [{ productId }] })
  } else {
    const exists = wishlist.products.some(
      (item) => item.productId.toString() === productId
    )
    if (exists) {
      return sendError(res, 'Product already in wishlist', 400)
    }
    wishlist.products.push({ productId })
    await wishlist.save()
  }

  await wishlist.populate('products.productId')

  sendSuccess(res, wishlist, 200, 'Product added to wishlist')
})

// REMOVE product from wishlist
export const removeFromWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id
  const { productId } = req.params

  const wishlist = await Wishlist.findOne({ userId })

  if (!wishlist) {
    return sendError(res, 'Wishlist not found', 404)
  }

  wishlist.products = wishlist.products.filter(
    (item) => item.productId.toString() !== productId
  )

  await wishlist.save()
  await wishlist.populate('products.productId')

  sendSuccess(res, wishlist, 200, 'Product removed from wishlist')
})

// CLEAR entire wishlist
export const clearWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id

  const wishlist = await Wishlist.findOne({ userId })

  if (!wishlist) {
    return sendError(res, 'Wishlist not found', 404)
  }

  wishlist.products = []
  await wishlist.save()

  sendSuccess(res, wishlist, 200, 'Wishlist cleared')
})
