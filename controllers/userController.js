import User from '../models/User.js'
import Order from '../models/Order.js'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

// Register user
export const register = catchAsync(async (req, res) => {
  const { firstName, lastName, email, phone, password, passwordConfirm } = req.body
  
  // Validation
  if (!firstName || !lastName || !email || !phone || !password) {
    return sendError(res, 'All fields are required', 400)
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!passwordRegex.test(password)) {
    return sendError(res, 'Password must be at least 8 characters and include uppercase, lowercase, and a number', 400)
  }
  
  if (password !== passwordConfirm) {
    return sendError(res, 'Passwords do not match', 400)
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return sendError(res, 'Email already registered', 400)
  }
  
  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password
  })
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: 'customer'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  
  // Remove password from response
  user.password = undefined
  
  sendSuccess(res, { 
    token, 
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone
    }
  }, 201, 'Registration successful')
})

// Login user
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body
  
  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400)
  }
  
  // Find user and include password field
  const user = await User.findOne({ email }).select('+password')
  
  if (!user) {
    return sendError(res, 'Invalid email or password', 401)
  }
  
  // Check password
  const isPasswordValid = await user.comparePassword(password)
  
  if (!isPasswordValid) {
    return sendError(res, 'Invalid email or password', 401)
  }
  
  // Update last login
  user.lastLogin = new Date()
  await user.save()
  
  // Generate token
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: 'customer'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  
  // Remove password from response
  user.password = undefined
  
  sendSuccess(res, {
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone
    }
  }, 200, 'Login successful')
})

// Get user profile
export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password')
  
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
  ).select('-password')
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  sendSuccess(res, user, 200, 'Profile updated successfully')
})

// Change password
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    return sendError(res, 'All password fields are required', 400)
  }
  
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!passwordRegex.test(newPassword)) {
    return sendError(res, 'Password must be at least 8 characters and include uppercase, lowercase, and a number', 400)
  }
  
  if (newPassword !== confirmPassword) {
    return sendError(res, 'Passwords do not match', 400)
  }
  
  // Get user with password field
  const user = await User.findById(req.user.userId).select('+password')
  
  if (!user) {
    return sendError(res, 'User not found', 404)
  }
  
  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword)
  
  if (!isPasswordValid) {
    return sendError(res, 'Current password is incorrect', 401)
  }
  
  // Update password
  user.password = newPassword
  await user.save()
  
  sendSuccess(res, null, 200, 'Password changed successfully')
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

  const updatedUser = await User.findById(req.user.userId).select('-password')
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
    .select('-password')
    .sort({ createdAt: -1 })
  sendSuccess(res, customers)
})
