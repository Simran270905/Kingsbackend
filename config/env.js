import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
]

const missingVars = requiredEnvVars.filter(env => !process.env[env])

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`)
  process.exit(1)
}

// Optional environment variables with warnings
const optionalEnvVars = [
  { key: 'EMAIL_USER', message: 'Email OTP service will not be available' },
  { key: 'EMAIL_PASS', message: 'Email OTP service will not be available' },
  { key: 'RAZORPAY_KEY_ID', message: 'Razorpay payment gateway will not be available' },
  { key: 'RAZORPAY_KEY_SECRET', message: 'Razorpay payment gateway will not be available' },
  { key: 'SHIPROCKET_EMAIL', message: 'Shiprocket shipping service will not be available' },
  { key: 'SHIPROCKET_PASSWORD', message: 'Shiprocket shipping service will not be available' },
  { key: 'PRODUCTION_URL', message: 'Production URL callbacks will use localhost' }
]

optionalEnvVars.forEach(({ key, message }) => {
  if (!process.env[key]) {
    console.warn(`⚠️ ${key} is not set. ${message}`)
  }
})

// Log successful loading of credentials
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  console.log('✅ Email credentials loaded successfully')
}

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  console.log('✅ Razorpay credentials loaded successfully')
}

if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
  console.log('✅ Shiprocket credentials loaded successfully')
}

if (process.env.PRODUCTION_URL) {
  console.log('✅ Production URL loaded successfully')
} else {
  console.warn('⚠️ PRODUCTION_URL not set - using localhost for callbacks')
}

// Export configuration object
export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGO_URI,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET
  },
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
    channelId: process.env.SHIPROCKET_CHANNEL_ID,
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary'
  },
  urls: {
    frontend: process.env.FRONTEND_URL,
    api: process.env.API_URL,
    development: process.env.DEVELOPMENT_URL || 'http://localhost:5173',
    production: process.env.PRODUCTION_URL || 'http://localhost:5000'
  }
}

export default config
