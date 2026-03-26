import dns from 'node:dns'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'

// Force reliable DNS resolution
dns.setServers(['8.8.8.8', '1.1.1.1'])

// Load environment variables
dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
const missingVars = requiredEnvVars.filter(env => !process.env[env])

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
  process.exit(1)
}

// Warn about optional email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER and EMAIL_PASS are not set. Email OTP service will not be available.')
} else {
  console.log('✅ Email credentials loaded successfully')
}

// Warn about optional Razorpay credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set. Razorpay payment gateway will not be available.')
} else {
  console.log('✅ Razorpay credentials loaded successfully')
}

// Import config and middleware
import './src/config/cloudinary.js'
import { createRateLimiter } from './src/middleware/authMiddleware.js'

// Import routes
import productRoutes from './src/routes/productRoutes.js'
import orderRoutes from './src/routes/orderRoutes.js'
import authRoutes from './src/routes/authRoutes.js'
import otpRoutes from './src/routes/otpRoutes.js'
import uploadRoutes from './src/routes/uploadRoutes.js'
import analyticsRoutes from './src/routes/analyticsRoutes.js'
import contentRoutes from './src/routes/contentRoutes.js'
import adminRoutes from './src/routes/adminRoutes.js'
import userRoutes from './src/routes/userRoutes.js'
import cartRoutes from './src/routes/cartRoutes.js'
import paymentRoutes from './src/routes/paymentRoutes.js'
import wishlistRoutes from './src/routes/wishlistRoutes.js'
import couponRoutes from './src/routes/couponRoutes.js'
import reviewRoutes from './src/routes/reviewRoutes.js'
import brandRoutes from './src/routes/brandRoutes.js'
import categoryRoutes from './src/routes/categoryRoutes.js'
import enhancedOrderRoutes from './src/routes/enhancedOrderRoutes.js'

// Import quick fix controller
import { fixDeliveredCODOrders, getCurrentStatus } from './src/controllers/quickFixController.js'

// Initialize app
const app = express()

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://www.kkingsjewellery.com',
  ...(process.env.NODE_ENV === 'development' ? [process.env.DEVELOPMENT_URL || 'http://localhost:5173'] : [])
]

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      scriptSrc: ["'self'"],
    }
  }
}))

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(compression())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Sanitize NoSQL injection attacks
app.use(mongoSanitize())

// Apply rate limiting
app.use(createRateLimiter())

// Routes
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/customers', userRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/brands', brandRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/admin/orders', enhancedOrderRoutes) // Enhanced order routes

// Quick fix routes (temporary)
app.get('/api/fix/status', getCurrentStatus)
app.get('/api/fix/delivered-cod', fixDeliveredCODOrders)

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🔥 KKings Jewellery API Running',
    status: 'active',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Global error handler
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production'
  const status = err.status || err.statusCode || 500

  if (status >= 500) {
    console.error(`❌ [${new Date().toISOString()}] ${req.method} ${req.path} - ${err.message}`)
  }

  res.status(status).json({
    success: false,
    message: isDev ? err.message : (status < 500 ? err.message : 'Internal server error'),
    ...(isDev && status >= 500 && { stack: err.stack })
  })
})

// MongoDB Connection
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI
    
    if (!uri) {
      throw new Error('MONGO_URI is missing from your .env file!')
    }

    const conn = await mongoose.connect(uri)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB Connection Error:')
    console.error(`Reason: ${err.message}`)
    
    if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 TIP: Check your MongoDB Atlas "Network Access" and ensure 0.0.0.0/0 is added.')
    }
    
    process.exit(1)
  }
}

connectDB()

// Start server
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 API Documentation: http://localhost:${PORT}/api`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`❌ Error: ${err.message}`)
  server.close(() => process.exit(1))
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed')
      process.exit(0)
    })
  })
})

export default app