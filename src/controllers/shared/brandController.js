import Brand from '../../models/Brand.js'
import cloudinary from 'cloudinary'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

// GET all brands
export const getBrands = catchAsync(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 })
  sendSuccess(res, { brands })
})

// GET all brands (admin - includes inactive)
export const getAllBrandsAdmin = catchAsync(async (req, res) => {
  const brands = await Brand.find().sort({ createdAt: -1 })
  sendSuccess(res, { brands })
})

// GET single brand
export const getBrandById = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.params.id)
  if (!brand) return sendError(res, 'Brand not found', 404)
  sendSuccess(res, brand)
})

// CREATE brand
export const createBrand = catchAsync(async (req, res) => {
  const { name, description, logo, logoPublicId } = req.body

  if (!name || !name.trim()) {
    return sendError(res, 'Brand name is required', 400)
  }

  const brand = new Brand({
    name: name.trim(),
    description: description || '',
    logo: logo || null,
    logoPublicId: logoPublicId || null
  })

  await brand.save()
  sendSuccess(res, brand, 201, 'Brand created successfully')
})

// UPDATE brand
export const updateBrand = catchAsync(async (req, res) => {
  const { id } = req.params
  const { name, description, logo, logoPublicId } = req.body

  const brand = await Brand.findById(id)
  if (!brand) return sendError(res, 'Brand not found', 404)

  // Delete old logo from Cloudinary if replaced
  if (logo && logo !== brand.logo && brand.logoPublicId) {
    try {
      await cloudinary.v2.uploader.destroy(brand.logoPublicId)
    } catch (e) {
      console.warn('⚠️ Failed to delete old brand logo from Cloudinary:', e.message)
    }
  }

  if (name) brand.name = name.trim()
  if (description !== undefined) brand.description = description
  if (logo !== undefined) brand.logo = logo
  if (logoPublicId !== undefined) brand.logoPublicId = logoPublicId

  await brand.save()
  sendSuccess(res, brand, 200, 'Brand updated successfully')
})

// DELETE brand
export const deleteBrand = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.params.id)
  if (!brand) return sendError(res, 'Brand not found', 404)

  // Delete logo from Cloudinary
  if (brand.logoPublicId) {
    try {
      await cloudinary.v2.uploader.destroy(brand.logoPublicId)
    } catch (e) {
      console.warn('⚠️ Failed to delete brand logo from Cloudinary:', e.message)
    }
  }

  await Brand.findByIdAndDelete(req.params.id)
  sendSuccess(res, null, 200, 'Brand deleted successfully')
})
