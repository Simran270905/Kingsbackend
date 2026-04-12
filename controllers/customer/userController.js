import bcrypt from 'bcryptjs'
import User from '../../models/User.js'
import Order from '../../models/Order.js'
import jwt from 'jsonwebtoken'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// Simple customer login (no password required)
export const login = catchAsync(async (req, res) => {
  const { email } = req.body

  // Validation
  if (!email) {
    return sendError(res, 'Email or phone is required', 400)
  }

  // Find user by email or phone
  const user = await User.findOne({
    $or: [{ email }, { phone: email }]
  })

  if (!user) {
    return sendError(res, 'User not found. Please register first.', 404)
  }

  if (!user.isActive) {
    return sendError(res, 'Account is deactivated', 401)
  }

  // No password required - login with just email/phone
  console.log('User logged in with email/phone:', user.email)

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  )

  // Update last login time
  user.lastLogin = new Date()
  await user.save()

  sendSuccess(res, {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin
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

// Create new order (customer protected)
export const createCustomerOrder = catchAsync(async (req, res) => {
  console.log('📦 DEBUG: createCustomerOrder called')
  console.log('📦 DEBUG: User ID from token:', req.user?.userId)
  
  const userId = req.user?.userId
  if (!userId) {
    console.log('❌ DEBUG: No userId found in request')
    return sendError(res, 'User not authenticated', 401)
  }

  const orderData = req.body
  console.log('📦 DEBUG: Order data received:', orderData)

  // Validate required fields
  const {
    items,
    shippingAddress,
    subtotal,
    tax = 0,
    shippingCost = 0,
    discount = 0,
    couponCode = null,
    totalAmount,
    paymentMethod = 'cod',
    notes
  } = orderData

  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'Order must contain at least one item', 400)
  }

  if (!shippingAddress) {
    return sendError(res, 'Shipping address is required', 400)
  }

  if (!totalAmount || totalAmount < 0) {
    return sendError(res, 'Valid total amount is required', 400)
  }

  try {
    // Transform items to match schema
    const transformedItems = items.map(item => ({
    productId: item.id || item.productId,
    name: item.name || item.title,
    price: item.price,
    quantity: item.quantity,
    selectedSize: item.selectedSize || null,
    image: item.image || null,
    subtotal: item.subtotal || (item.price * item.quantity)
  }))

  // Extract customer details from shippingAddress
  const {
    firstName = '',
    lastName = '',
    email = '',
    mobile = '',
    streetAddress = '',
    city = '',
    state = '',
    zipCode = ''
  } = shippingAddress

  // Create order with proper userId and customer object
  const order = new Order({
    userId, // ✅ Ensure userId is properly assigned
    items: transformedItems,
    customer: {
      firstName,
      lastName,
      email,
      mobile,
      streetAddress,
      city,
      state,
      zipCode
    },
    subtotal: subtotal || totalAmount,
    tax,
    shippingCost,
    discount,
    couponCode,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    status: 'pending',
    amountPaid: paymentMethod === 'cod' ? 0 : totalAmount,
    paymentDate: paymentMethod === 'cod' ? null : new Date(),
    notes: paymentMethod === 'cod' ? 'Cash on Delivery - Payment to be collected on delivery' : 'Order created successfully'
  })

  await order.save()
  
  console.log(`📦 Customer Order created: ${order._id} | User: ${userId} | Method: ${paymentMethod} | Amount: ₹${totalAmount}`)
  
  // Populate user data for response
  await order.populate('userId', 'name email mobile')

  // Return standardized response
  sendSuccess(res, {
    success: true,
    order,
    message: 'Order created successfully'
  }, 201);
} catch (error) {
  console.error('📦 ORDER CREATION ERROR:', error)
  console.error('📦 ERROR STACK:', error.stack)
  console.error('📦 ERROR DETAILS:', {
    message: error.message,
    name: error.name,
    userId: req.user?.userId,
    orderData: req.body
  })
  
  return sendError(res, 
    error.message || 'Order creation failed. Please try again.', 
    500
  );
}
})

// Get user's order history
export const getOrderHistory = catchAsync(async (req, res) => {
  console.log('🔍 DEBUG: getOrderHistory called')
  console.log('🔍 DEBUG: User ID from token:', req.user?.userId)
  
  const userId = req.user?.userId
  if (!userId) {
    console.log('❌ DEBUG: No userId found in request')
    return sendError(res, 'User not authenticated', 401)
  }

  const { status, page = 1, limit = 10 } = req.query
  
  let query = { userId }
  if (status && status !== 'all') {
    query.status = status
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  
  console.log('🔍 DEBUG: Query:', query)
  console.log('🔍 DEBUG: Page:', page, 'Limit:', limit, 'Skip:', skip)

  const orders = await Order.find(query)
    .populate('userId', 'name email mobile')
    .populate('items.productId', 'name price images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  const total = await Order.countDocuments(query)
  
  console.log('✅ DEBUG: Found orders:', orders.length)
  console.log('✅ DEBUG: Total orders:', total)

  // Return standardized response format
  sendSuccess(res, {
    success: true,
    orders,
    count: orders.length,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit)
    }
  })
})

// Admin: Get all customers
export const getAllCustomers = catchAsync(async (req, res) => {
  const customers = await User.find({})
    .sort({ createdAt: -1 })
  sendSuccess(res, customers)
})
