import express from 'express'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'

// Import new configuration
import config from './src/config/env.js'
import connectDB from './src/config/database.js'
import './src/config/cloudinary.js'

// Import middleware
import { createRateLimiter } from './src/middleware/auth.js'
import { globalErrorHandler, notFound } from './src/middleware/errorHandler.js'

// Import routes
import routes from './src/routes/index.js'

// Import quick fix controller (temporary)
import { fixDeliveredCODOrders, getCurrentStatus } from './src/controllers/shared/quickFixController.js'

// Initialize app
const app = express()

// Middleware
const allowedOrigins = [
  config.urls.frontend,
  ...(config.nodeEnv === 'development' ? [config.urls.development] : [])
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(mongoSanitize())
app.use(createRateLimiter())

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KKings Jewellery API is running',
    version: '2.0.0',
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
    version: '2.0.0',
    timestamp: new Date().toISOString()
  })
})

// Mount routes
app.use('/api', routes)

// Quick fix routes (temporary)
app.get('/api/fix/status', getCurrentStatus)
app.post('/api/fix/delivered-orders', fixDeliveredCODOrders)

// 404 handler
app.use(notFound)

// Global error handler
app.use(globalErrorHandler)

// Start server
const PORT = process.env.PORT || 5001
const startServer = async () => {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📝 API Documentation: http://localhost:${PORT}/api`)
      console.log(`🌍 Environment: ${config.nodeEnv}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
