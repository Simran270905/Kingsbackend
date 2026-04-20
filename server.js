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

// Debug: Show loaded environment variables (in development only)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Environment Variables Debug:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('PORT:', process.env.PORT)
  console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing')
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing')
  console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ Missing')
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing')
}

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
const missingVars = requiredEnvVars.filter(env => !process.env[env])

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
  console.error('💡 Please check your .env file and ensure all required variables are set.')
  process.exit(1)
}

// Warn about optional email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER and EMAIL_PASS are not set. Email OTP service will not be available.')
} else {
  console.log(' Email credentials loaded successfully')
  console.log('EMAIL_USER:', process.env.EMAIL_USER)
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Missing')
}

// Warn about optional Razorpay credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('Razorpay credentials are not set. Razorpay payment gateway will not be available.')
} else {
  console.log('Razorpay credentials loaded successfully')
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID)
  console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Missing')
}

// Validate Shiprocket environment variables
if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
  console.error('FATAL: SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not set in environment')
  process.exit(1)
} else {
  console.log('Shiprocket credentials validated')
  console.log('SHIPROCKET_EMAIL:', process.env.SHIPROCKET_EMAIL ? 'Set' : 'Missing')
  console.log('SHIPROCKET_PASSWORD:', process.env.SHIPROCKET_PASSWORD ? 'Set' : 'Missing')
}

// Warn about FRONTEND_URL
if (!process.env.FRONTEND_URL) {
  console.warn('⚠️ FRONTEND_URL not set in environment. CORS may not work correctly in production.')
  console.warn('Set FRONTEND_URL to your production frontend URL (e.g., https://kkingsjewellery.com)')
} else {
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL)
}

// Import config and middleware
import './config/cloudinary.js'
import { createRateLimiter } from './middleware/auth.js'

// Import routes (using the proper structure)
import routes from './routes/index.js'
import customerRoutes from './routes/customer/index.js'
import shiprocketTestRoutes from './routes/shiprocketTestRoutes.js'
import shiprocketWebhookRoutes from './routes/shiprocketWebhookRoutes.js'

// Import quick fix controller
import { fixDeliveredCODOrders, getCurrentStatus } from './controllers/shared/quickFixController.js'

// Import Shiprocket service for token warm-up
import shiprocketService from './services/shiprocketService.js'

// Initialize app
const app = express()

// Middleware

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
  origin: [
    'https://www.kkingsjewellery.com',
    'https://kkingsjewellery.com',
    'https://api.kkingsjewellery.com',
    'https://kings-main.vercel.app',
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:4173',
    'http://localhost:4174',
    // Allow all localhost ports for development
    /^http:\/\/localhost:\d+$/
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// Cache control headers to prevent browser caching issues
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

app.use(compression())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Sanitize NoSQL injection attacks
app.use(mongoSanitize())

// Apply rate limiting
app.use(createRateLimiter())

// Mount routes
console.log(' DEBUG: Mounting main routes at /api')
app.use('/api', routes)

// Debug route to test admin routes mounting
app.get('/api/debug/admin-routes', async (req, res) => {
  console.log('🔍 Debug: Admin routes debug endpoint hit')
  try {
    const adminRoutes = await import('./routes/admin/adminRoutes.js')
    console.log('🔍 Admin routes loaded:', typeof adminRoutes.default)
    console.log('🔍 Admin routes methods:', Object.keys(adminRoutes.default || {}))
    res.json({
      success: true,
      message: 'Admin routes debug',
      routesLoaded: !!adminRoutes.default,
      routeCount: Object.keys(adminRoutes.default || {}).length
    })
  } catch (error) {
    console.error('❌ Admin routes import error:', error)
    res.status(500).json({
      success: false,
      message: 'Admin routes import failed',
      error: error.message
    })
  }
})

// Simple dashboard route directly in server.js
app.get('/api/admin/dashboard', async (req, res) => {
  console.log('🔍 Debug: Direct dashboard route hit!')
  try {
    // Import the controller directly
    const { getDashboardStats } = await import('./controllers/admin/adminDashboardController.js')
    console.log('🔍 Dashboard controller imported successfully')
    
    // Call the controller function
    await getDashboardStats(req, res)
  } catch (error) {
    console.error('❌ Dashboard controller error:', error)
    res.status(500).json({
      success: false,
      message: 'Dashboard controller error',
      error: error.message
    })
  }
})

// Direct customer routes for frontend compatibility
console.log(' Direct customer routes for frontend compatibility')
app.use('/customers', customerRoutes)

// Shiprocket webhook routes
console.log(' Mounting Shiprocket webhook routes at /api')
app.use('/api', shiprocketWebhookRoutes)

//  ADDED: Debug route to test server
app.get('/api/debug/routes', (req, res) => {
  console.log(' DEBUG: Debug routes endpoint hit')
  
  // Log all registered routes
  console.log('Registered routes:')
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Array.isArray(middleware.route.methods) 
        ? middleware.route.methods.join(', ')
        : middleware.route.methods;
      console.log(`  ${methods}: ${middleware.route.path}`);
    }
  })
  
  // Specifically log webhook routes
  console.log('Webhook routes registered:')
  app._router.stack.forEach((middleware) => {
    if (middleware.route && middleware.route.path.includes('fulfillment')) {
      const methods = Array.isArray(middleware.route.methods) 
        ? middleware.route.methods.join(', ')
        : middleware.route.methods;
      console.log(`  ${methods}: ${middleware.route.path}`);
    }
  })
  
  res.json({
    success: true,
    message: 'Server is running and routes are mounted',
    routes: {
      api: '/api/*',
      customers: '/customers/*',
      coupons: '/api/coupons/*',
      health: '/api/health'
    },
    timestamp: new Date().toISOString()
  })
})

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

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message
      return acc
    }, {})
    
    console.error(`[VALIDATION_ERROR] ${req.method} ${req.path}:`, errors)
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors
    })
  }

  // Handle Mongoose Cast Errors (invalid ObjectID)
  if (err.name === 'CastError') {
    console.error(`[CAST_ERROR] ${req.method} ${req.path}: Invalid ${err.path}: ${err.value}`)
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    })
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    console.error(`[DUPLICATE_ERROR] ${req.method} ${req.path}: Duplicate ${field}`)
    return res.status(422).json({
      success: false,
      message: `${field} already exists`,
      errors: {
        [field]: `${field} already exists`
      }
    })
  }

  // Handle other errors
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'

  if (status >= 500) {
    console.error(`[SERVER_ERROR] ${new Date().toISOString()} ${req.method} ${req.path}:`, message)
  }

  res.status(status).json({
    success: false,
    message: isDev || status < 500 ? message : 'Internal server error',
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
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
      connectTimeoutMS: 10000, // Time to establish initial connection
      retryWrites: true, // Retry write operations
      retryReads: true, // Retry read operations
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
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 API Documentation: http://localhost:${PORT}/api`)
  
  // Warm up Shiprocket token on server start
  try {
    console.log('🔄 Warming up Shiprocket token...')
    await shiprocketService.authenticate()
    console.log('✅ Shiprocket token warmed up successfully')
  } catch (error) {
    console.warn('⚠️ Shiprocket token warm-up failed:', error.message)
    console.warn('Shiprocket integration will work on first request')
  }
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`❌ Error: ${err.message}`)
  server.close(() => process.exit(1))
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 SIGTERM signal received: closing HTTP server')
  server.close(async () => {
    console.log('HTTP server closed')
    try {
      await mongoose.connection.close()
      console.log('MongoDB connection closed')
      process.exit(0)
    } catch (err) {
      console.error('Error closing MongoDB connection:', err)
      process.exit(1)
    }
  })
})

export default app