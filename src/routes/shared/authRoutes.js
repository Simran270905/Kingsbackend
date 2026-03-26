import express from 'express'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import { loginRateLimiter } from '../../middleware/authMiddleware.js'
import { validateAdminLogin } from '../../middleware/validateRequest.js'

const router = express.Router()

// ADMIN LOGIN
router.post('/login', loginRateLimiter, validateAdminLogin, async (req, res) => {
  const { password } = req.body

  const storedPassword = process.env.ADMIN_PASSWORD
  if (!storedPassword) {
    return res.status(500).json({ success: false, message: 'Admin not configured' })
  }

  const isMatch = storedPassword.startsWith('$2')
    ? await bcryptjs.compare(password, storedPassword)
    : password === storedPassword

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid password' })
  }

  const token = jwt.sign(
    { role: 'admin', loginTime: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  res.json({ success: true, token })
})

// VERIFY TOKEN
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader) return res.sendStatus(401)

  const token = authHeader.split(' ')[1]

  try {
    jwt.verify(token, process.env.JWT_SECRET)
    res.json({ valid: true })
  } catch {
    res.sendStatus(403)
  }
})

export default router