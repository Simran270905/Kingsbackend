import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const routesDir = path.join(__dirname, 'src/routes/shared')

// Define route files and their controllers
const routeConfigs = {
  'orders.js': {
    controller: 'orderController.js',
    methods: ['getOrders', 'getOrder', 'createOrder', 'updateOrder', 'deleteOrder']
  },
  'payments.js': {
    controller: 'paymentController.js',
    methods: ['getPayments', 'getPayment', 'createPayment', 'updatePayment']
  },
  'uploads.js': {
    controller: '../../controllers/shared/uploadController.js', // Special case
    methods: ['uploadImage', 'uploadImages', 'deleteImage']
  },
  'otp.js': {
    controller: 'otpController.js',
    methods: ['sendOTP', 'verifyOTP', 'resendOTP']
  },
  'auth.js': {
    controller: 'authController.js',
    methods: ['login', 'register', 'logout', 'refreshToken']
  },
  'reviews.js': {
    controller: 'reviewController.js',
    methods: ['getReviews', 'getReview', 'createReview', 'updateReview', 'deleteReview']
  },
  'coupons.js': {
    controller: 'couponController.js',
    methods: ['getCoupons', 'getCoupon', 'createCoupon', 'updateCoupon', 'deleteCoupon']
  },
  'content.js': {
    controller: 'contentController.js',
    methods: ['getContent', 'updateContent']
  }
}

// Function to create route file
function createRouteFile(filename, config) {
  const filePath = path.join(routesDir, filename)
  
  let content = `import express from 'express'\n`
  
  if (filename === 'uploads.js') {
    content += `import { uploadImage, uploadImages, deleteImage } from '${config.controller}'\n`
  } else {
    content += `import { ${config.methods.join(', ')} } from '../controllers/shared/${config.controller}'\n`
  }
  
  content += `import { authenticate } from '../middleware/auth.js'\n\n`
  content += `const router = express.Router()\n\n`
  
  // Add routes based on methods
  config.methods.forEach(method => {
    if (method.startsWith('get') && (method.includes('s') || method === 'getContent')) {
      // Public GET routes (plural or content)
      if (method === 'getContent') {
        content += `router.get('/', ${method})\n`
      } else {
        content += `router.get('/', ${method})\n`
      }
    } else if (method.startsWith('get') && !method.includes('s')) {
      // Singular GET routes
      if (method === 'getContent') {
        content += `router.get('/:type', ${method})\n`
      } else {
        content += `router.get('/:id', ${method})\n`
      }
    } else if (method === 'sendOTP' || method === 'verifyOTP' || method === 'resendOTP') {
      // Public OTP routes
      const routePath = method.replace('OTP', '-otp').toLowerCase()
      content += `router.post('/${routePath}', ${method})\n`
    } else if (method === 'login' || method === 'register') {
      // Public auth routes
      content += `router.post('/${method}', ${method})\n`
    } else {
      // Protected routes
      const routePath = method.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
      if (method.includes('delete')) {
        content += `router.delete('/:id', authenticate, ${method})\n`
      } else if (method.includes('update')) {
        content += `router.put('/:id', authenticate, ${method})\n`
      } else if (method.includes('create')) {
        content += `router.post('/', authenticate, ${method})\n`
      } else {
        content += `router.post('/${routePath}', authenticate, ${method})\n`
      }
    }
  })
  
  content += `\nexport default router\n`
  
  fs.writeFileSync(filePath, content)
  console.log(`✅ Created route file: ${filename}`)
}

// Create all route files
console.log('🔧 Creating missing route files...')
Object.entries(routeConfigs).forEach(([filename, config]) => {
  createRouteFile(filename, config)
})

console.log('✅ Route files creation completed!')
