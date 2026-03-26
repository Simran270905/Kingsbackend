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

// Initialize app
const app = express()

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://www.kkingsjewellery.com',
  process.env.CLIENT_URL || 'https://www.kkingsjewellery.com',
  'https://kings-main.vercel.app',
  'https://kkings-jewellery.vercel.app',
  ...(process.env.NODE_ENV === 'development' ? [
    process.env.DEVELOPMENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176'
  ] : [])
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

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🔥 KKings Jewellery API Running',
    status: 'active',
    timestamp: new Date().toISOString()
  })
})

// Comprehensive health check endpoint for Render
app.get('/api/health', (req, res) => {
  try {
    const mongooseState = mongoose.connection.readyState
    const states = {0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting'}
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      api: {
        running: true,
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: states[mongooseState],
        connected: mongooseState === 1,
        type: 'MongoDB'
      },
      services: {
        email: {
          configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
          provider: process.env.EMAIL_USER ? 'Gmail' : 'Not configured'
        },
        payment: {
          razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
          stripe: !!process.env.STRIPE_SECRET_KEY
        },
        storage: {
          cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME)
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// API Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      otp: '/api/otp',
      auth: '/api/auth',
      customers: '/api/customers',
      orders: '/api/orders',
      cart: '/api/cart',
      payments: '/api/payments'
    }
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

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI
    
    if (!uri) {
      throw new Error('MONGO_URI is missing from your .env file!')
    }

    // MongoDB connection options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    }

    const conn = await mongoose.connect(uri, options)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected')
    })

    return conn
  } catch (err) {
    console.error('❌ MongoDB Connection Error:')
    console.error(`Reason: ${err.message}`)
    
    if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 TIP: Check your MongoDB Atlas "Network Access" and ensure 0.0.0.0/0 is added.')
    }
    
    if (err.message.includes('ENOTFOUND')) {
      console.log('💡 TIP: Check your MongoDB URI format and network connectivity.')
    }
    
    if (err.message.includes('authentication')) {
      console.log('💡 TIP: Check your MongoDB username, password, and database name.')
    }
    
    // Retry connection after 5 seconds
    console.log('🔄 Retrying MongoDB connection in 5 seconds...')
    setTimeout(() => {
      connectDB()
    }, 5000)
    
    // Don't exit immediately, let the retry mechanism work
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        console.error('❌ Failed to connect to MongoDB after retries. Exiting.')
        process.exit(1)
      }, 30000) // Exit after 30 seconds of failed attempts
    }
  }
}

connectDB()

// Start server
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 API Documentation: http://localhost:${PORT}/api`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌍 CORS Origins: ${allowedOrigins.join(', ')}`)
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
