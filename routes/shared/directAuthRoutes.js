import express from 'express';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = express.Router();

// Register or login user directly (no OTP)
router.post('/register-or-login', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    console.log('🔍 Looking for existing user:', email);

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      console.log('✅ Existing user found, logging in');
      
      // Update user info if needed
      const nameParts = name.trim().split(' ');
      if (user.firstName !== nameParts[0] || user.lastName !== nameParts.slice(1).join(' ')) {
        user.firstName = nameParts[0];
        user.lastName = nameParts.slice(1).join(' ') || '';
        user.phone = phone;
        await user.save();
        console.log('🔄 Updated existing user info');
      }
    } else {
      console.log('👤 Creating new user');
      
      // Create new user
      const nameParts = name.trim().split(' ');
      user = new User({
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || '',
        email: email.toLowerCase(),
        phone: phone,
        verified: true, // Auto-verify since no OTP
        createdAt: new Date()
      });

      await user.save();
      console.log('✅ New user created successfully');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        phone: user.phone,
        role: user.role || 'customer'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('🔐 JWT token generated for user:', user.email);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token: token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          verified: user.verified,
          role: user.role || 'customer'
        }
      }
    });

  } catch (error) {
    console.error('❌ Auth error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

export default router;
