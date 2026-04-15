import Category from '../../models/Category.js'
import cloudinary from 'cloudinary'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

// GET all active categories (public)
export const getCategories = catchAsync(async (req, res) => {
  console.log("Categories API HIT")
  const startTime = Date.now()
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).maxTimeMS(5000)
  const endTime = Date.now()
  console.log(`Categories API response time: ${endTime - startTime}ms`)
  sendSuccess(res, { categories })
})

// GET all categories (admin - includes inactive)
export const getAllCategoriesAdmin = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, createdAt: -1 })
  sendSuccess(res, { categories })
})

// GET single category
export const getCategoryById = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id)
  if (!category) return sendError(res, 'Category not found', 404)
  sendSuccess(res, category)
})

// CREATE category
export const createCategory = catchAsync(async (req, res) => {
  const { name, description, image, imagePublicId, sortOrder } = req.body

  if (!name || !name.trim()) {
    return sendError(res, 'Category name is required', 400)
  }

  const existing = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } })
  if (existing) {
    return sendError(res, 'Category with this name already exists', 400)
  }

  const category = new Category({
    name: name.trim(),
    description: description || '',
    image: image || null,
    imagePublicId: imagePublicId || null,
    sortOrder: sortOrder || 0
  })

  await category.save()
  sendSuccess(res, category, 201, 'Category created successfully')
})

// UPDATE category
export const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params
  const { name, description, image, imagePublicId, sortOrder, isActive } = req.body

  const category = await Category.findById(id)
  if (!category) return sendError(res, 'Category not found', 404)

  // Delete old image from Cloudinary if replaced
  if (image && image !== category.image && category.imagePublicId) {
    try {
      await cloudinary.v2.uploader.destroy(category.imagePublicId)
      console.log(`🗑️ Deleted old category image: ${category.imagePublicId}`)
    } catch (e) {
      console.warn('⚠️ Failed to delete old category image from Cloudinary:', e.message)
    }
  }

  if (name) category.name = name.trim()
  if (description !== undefined) category.description = description
  if (image !== undefined) category.image = image
  if (imagePublicId !== undefined) category.imagePublicId = imagePublicId
  if (sortOrder !== undefined) category.sortOrder = sortOrder
  if (isActive !== undefined) category.isActive = isActive

  await category.save()
  sendSuccess(res, category, 200, 'Category updated successfully')
})

// DELETE category
export const deleteCategory = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id)
  if (!category) return sendError(res, 'Category not found', 404)

  // Delete image from Cloudinary
  if (category.imagePublicId) {
    try {
      await cloudinary.v2.uploader.destroy(category.imagePublicId)
      console.log(`🗑️ Deleted category image from Cloudinary: ${category.imagePublicId}`)
    } catch (e) {
      console.warn('⚠️ Failed to delete category image from Cloudinary:', e.message)
    }
  }

  await Category.findByIdAndDelete(req.params.id)
  sendSuccess(res, null, 200, 'Category deleted successfully')
})
