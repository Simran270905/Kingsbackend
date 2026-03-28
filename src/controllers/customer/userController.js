import bcrypt from 'bcryptjs'
import User from '../../models/User.js'
import Order from '../../models/Order.js'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// Simple customer login
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body

  // Validation
  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400)
  }

  // Find user by email or phone
  const user = await User.findOne({
    $or: [{ email }, { phone: email }]
  })

  if (!user) {
    return sendError(res, 'Invalid credentials', 401)
  }

  if (!user.isActive) {
    return sendError(res, 'Account is deactivated', 401)
  }

  // If user has password, verify it
  if (user.password) {
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401)
    }
  } else {
    // For users without password (created via OTP), any password works for now
    // In production, you might want to require password setup
    console.log('User logging in without password set (OTP user)')
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  )

  sendSuccess(res, {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive
    },
    token
  }, 200, 'Login successful')
})

// Simple customer registration
export const register = catchAsync(async (req, res) => {
  const { name, email, phone } = req.body

  // Validation
  if (!name || !email || !phone) {
    return sendError(res, 'Name, email, and phone are required', 400)
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return sendError(res, 'Please enter a valid email address', 400)
  }

  // Phone validation
  if (!/^[0-9]{10}$/.test(phone)) {
    return sendError(res, 'Please enter a valid 10-digit phone number', 400)
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  })

  if (existingUser) {
    if (existingUser.email === email) {
      return sendError(res, 'An account with this email already exists', 400)
    }
    if (existingUser.phone === phone) {
      return sendError(res, 'An account with this phone number already exists', 400)
    }
  }

  // Split name into first and last name
  const nameParts = name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || ''

  // Create new user
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    isActive: true
  })

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  )

  sendSuccess(res, {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive
    },
    token
  }, 201, 'Account created successfully')
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
