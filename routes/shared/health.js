import express from 'express'
import mongoose from 'mongoose'
import { sendSuccess, sendError } from '../../utils/errorHandler.js'

const router = express.Router()

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'connected'
    } else {
      health.services.database = 'disconnected'
      health.status = 'ERROR'
    }

    if (health.status === 'OK') {
      return sendSuccess(res, health, 200, 'All systems operational')
    } else {
      return sendError(res, 'Some services are not operational', 503)
    }
  } catch (error) {
    return sendError(res, 'Health check failed', 500)
  }
})

// API status endpoint
router.get('/status', (req, res) => {
  const status = {
    api: 'KKings Jewellery Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      products: '/api/products',
      categories: '/api/categories',
      brands: '/api/brands',
      admin: '/api/admin/*',
      customers: '/api/customers/*'
    }
  }
  
  return sendSuccess(res, status, 200, 'API status retrieved')
})

export default router
