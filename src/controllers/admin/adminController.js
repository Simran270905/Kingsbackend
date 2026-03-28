import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// ======================
// 🔐 LOGIN ADMIN
// ======================
export const loginAdmin = catchAsync(async (req, res) => {
  const { password } = req.body

  if (!password) {
    return sendError(res, 'Password is required', 400)
  }

  // Compare password - supports both bcrypt hash and plain text
  const storedPassword = process.env.ADMIN_PASSWORD
  console.log('🔍 Debug - Stored password from env:', storedPassword)
  console.log('🔍 Debug - Submitted password:', password)
  console.log('🔍 Debug - Stored password length:', storedPassword?.length)
  console.log('🔍 Debug - Submitted password length:', password?.length)
  
  if (!storedPassword) {
    return sendError(res, 'Admin not configured', 500)
  }

  const isMatch = storedPassword.startsWith('$2')
    ? await bcryptjs.compare(password, storedPassword)
    : password === storedPassword

  console.log('🔍 Debug - Password match result:', isMatch)

  if (!isMatch) {
    console.log('❌ Admin login failed - invalid password')
    return sendError(res, 'Invalid password', 401)
  }

  // ✅ Generate token
  const token = jwt.sign(
    {
      role: 'admin',
      loginTime: Date.now()
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '365d' }
  )

  console.log('✅ Admin login success')

  sendSuccess(res, { token }, 200, 'Login successful')
})


// ======================
// 🔍 VERIFY ADMIN TOKEN
// ======================
export const verifyAdmin = catchAsync(async (req, res) => {
  // ✅ Extra safety check
  if (req.admin?.role !== 'admin') {
    return sendError(res, 'Not authorized as admin', 403)
  }

  sendSuccess(res, { valid: true }, 200, 'Token is valid')
})


// ======================
// 🚪 LOGOUT ADMIN
// ======================
export const logoutAdmin = catchAsync(async (req, res) => {
  // Optional: future token blacklist logic
  sendSuccess(res, null, 200, 'Logout successful')
})