import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Admin from '../models/AdminModel.js'

dotenv.config()

const createTestAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'test@kkings.com' })
    if (existingAdmin) {
      console.log('✅ Test admin already exists')
      console.log('Email: test@kkings.com')
      console.log('Password: test123456')
      return
    }
    
    // Create test admin
    const hashedPassword = await bcrypt.hash('test123456', 12)
    
    const admin = new Admin({
      name: 'Test Admin',
      email: 'test@kkings.com',
      password: hashedPassword,
      role: 'admin'
    })
    
    await admin.save()
    console.log('✅ Test admin created successfully')
    console.log('Email: test@kkings.com')
    console.log('Password: test123456')
    
  } catch (error) {
    console.error('❌ Failed to create test admin:', error)
  } finally {
    await mongoose.connection.close()
  }
}

createTestAdmin()
