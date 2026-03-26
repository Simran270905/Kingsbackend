import bcrypt from 'bcryptjs'
import User from '../../models/User.js'
import Order from '../../models/Order.js'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'

// Simple login with name, email, and phone only
export const simpleLogin = catchAsync(async (req, res) => {
  const { name, email, phone } = req.body

  // Validation
  if (!name || !email || !phone) {
    return sendError(res, 'Name, email, and phone are required', 400)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return sendError(res, 'Please enter a valid email address', 400)
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    return sendError(res, 'Please enter a valid 10-digit phone number', 400)
  }

  // Check if user exists by email or phone
  let user = await User.findOne({ 
    $or: [{ email }, { phone }] 
  })

  if (user) {
    // Existing user - update name if different
    if (user.firstName !== name.split(' ')[0] || user.lastName !== name.split(' ').slice(1).join(' ')) {
      const nameParts = name.split(' ')
      user.firstName = nameParts[0]
      user.lastName = nameParts.slice(1).join(' ')
      await user.save()
    }
  } else {
    // New user - create account
    const nameParts = name.split(' ')
    user = new User({
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      email,
      phone
    })
    await user.save()
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  // Return user data and token
  const userData = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    addresses: user.addresses || []
  }

  sendSuccess(res, { user: userData, token }, 200, 'Login successful')
})

// Change customer password
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body

  if (!currentPassword || !newPassword || !confirmPassword) {
    return sendError(res, 'Current password, new password, and confirm password are required', 400)
  }

  if (newPassword !== confirmPassword) {
    return sendError(res, 'New password and confirm password must match', 400)
  }

  if (newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters', 400)
  }

  const user = await User.findById(req.user.userId).select('+password')

  if (!user) {
    return sendError(res, 'User not found', 404)
  }

  if (!user.password) {
    return sendError(res, 'Password not set for user. Please set password through account settings or use OTP login workflow.', 400)
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    return sendError(res, 'Current password is incorrect', 401)
  }

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()

  sendSuccess(res, null, 200, 'Password changed successfully')
})

// Get user profile
export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId)
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  sendSuccess(res, user)
})

// Update user profile
export const updateProfile = catchAsync(async (req, res) => {
  const { firstName, lastName, phone } = req.body
  
  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { firstName, lastName, phone },
    { new: true, runValidators: true }
  )
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  sendSuccess(res, user, 200, 'Profile updated successfully')
})

// Get user addresses
export const getAddresses = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId).select('addresses')
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  sendSuccess(res, user.addresses)
})

// Add address
export const addAddress = catchAsync(async (req, res) => {
  const { firstName, lastName, email, streetAddress, city, state, zipCode, mobile, isDefault } = req.body

  const user = await User.findById(req.user.userId)
  if (!user) {
    return sendError(res, 'User not found', 404)
  }

  // If new address is default, clear previous default addresses
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false
    })
  }

  // If no address exists yet, make this first one default
  const defaultFlag = user.addresses.length === 0 ? true : !!isDefault

  user.addresses.push({
    firstName,
    lastName,
    email,
    streetAddress,
    city,
    state,
    zipCode,
    mobile,
    isDefault: defaultFlag
  })

  await user.save()

  const updatedUser = await User.findById(req.user.userId)
  sendSuccess(res, updatedUser, 201, 'Address added successfully')
})

// Delete address
export const deleteAddress = catchAsync(async (req, res) => {
  const { addressIndex } = req.params
  
  const user = await User.findById(req.user.userId)
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  user.addresses.splice(parseInt(addressIndex), 1)
  await user.save()
  
  sendSuccess(res, user, 200, 'Address deleted successfully')
})

// Get user's order history
export const getOrderHistory = catchAsync(async (req, res) => {
  const orders = await Order.find({ userId: req.user.userId })
    .populate('items.productId', 'name price images')
    .sort({ createdAt: -1 })
  
  sendSuccess(res, orders)
})

// Admin: Get all customers
export const getAllCustomers = catchAsync(async (req, res) => {
  const customers = await User.find({})
    .sort({ createdAt: -1 })
  sendSuccess(res, customers)
})
