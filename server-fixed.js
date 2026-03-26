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

// Import routes from correct paths
import productRoutes from './routes/shared/productRoutes.js'
import orderRoutes from './routes/shared/orderRoutes.js'
import authRoutes from './routes/shared/authRoutes.js'
import otpRoutes from './routes/shared/otpRoutes.js'
import uploadRoutes from './routes/shared/uploadRoutes.js'
import analyticsRoutes from './routes/admin/analyticsRoutes.js'
import contentRoutes from './routes/shared/contentRoutes.js'
import adminRoutes from './routes/admin/adminRoutes.js'
import userRoutes from './routes/customer/userRoutes.js'
import cartRoutes from './routes/customer/cartRoutes.js'
import paymentRoutes from './routes/shared/paymentRoutes.js'
import wishlistRoutes from './routes/customer/wishlistRoutes.js'
import couponRoutes from './routes/shared/couponRoutes.js'
import reviewRoutes from './routes/shared/reviewRoutes.js'
import brandRoutes from './routes/shared/brandRoutes.js'
import categoryRoutes from './routes/shared/categoryRoutes.js'
import enhancedOrderRoutes from './routes/admin/enhancedOrderRoutes.js'

// Import config and middleware
import './config/cloudinary.js'
import { createRateLimiter } from './middleware/authMiddleware.js'

// Initialize app
const app = express()

// Middleware with updated CORS
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
app.use(mongoSanitize())
app.use(createRateLimiter())

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KKings Jewellery API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// API documentation
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KKings Jewellery API Documentation',
    endpoints: {
      admin: '/api/admin',
      customer: '/api/customers',
      products: '/api/products',
      orders: '/api/orders',
      payments: '/api/payments',
      upload: '/api/upload'
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// Mount routes
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
app.use('/api/enhanced-orders', enhancedOrderRoutes)

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`)
  res.status(404)
  next(error)
})

// Global error handler
app.use((err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error(err)

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = { message, statusCode: 401 }
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = { message, statusCode: 401 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Start server
const PORT = process.env.PORT || 5000

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('🔌 MongoDB connection closed through app termination')
      process.exit(0)
    })

    return conn
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

const startServer = async () => {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📝 API Documentation: http://localhost:${PORT}/api`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🌍 CORS Origins: ${allowedOrigins.join(', ')}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
