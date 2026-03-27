import User from '../models/User.js'

export const loginOrRegisterUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      })
    }

    // Validate phone format (10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      })
    }

    // Split name into first and last name
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || 'Unknown'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    // Check if user exists using email OR phone
    let user = await User.findOne({
      $or: [{ email }, { phone }],
      isActive: true
    })

    if (!user) {
      // Create new user
      user = await User.create({
        firstName,
        lastName,
        email,
        phone,
        verified: true, // Auto-verify for simple login
        lastLogin: new Date()
      })
    } else {
      // Update last login and name if different
      user.lastLogin = new Date()
      if (user.firstName !== firstName || user.lastName !== lastName) {
        user.firstName = firstName
        user.lastName = lastName
        await user.save()
      }
    }

    res.status(200).json({
      success: true,
      message: user.isNew ? 'Registration successful' : 'Login successful',
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: 'customer',
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Login/Register error:', error)
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('firstName lastName email phone createdAt lastLogin totalOrders totalSpent')
      .sort({ createdAt: -1 })

    const formattedUsers = users.map(user => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: 'customer',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      totalOrders: user.totalOrders,
      totalSpent: user.totalSpent
    }))

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: formattedUsers,
      count: formattedUsers.length
    })
  } catch (error) {
    console.error('Get all users error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    })
  }
}
