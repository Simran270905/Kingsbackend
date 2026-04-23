#!/usr/bin/env node

// Test script to check Review model
import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Load environment variables
dotenv.config()

console.log('=== REVIEW MODEL TEST ===')
console.log('')

async function testReviewModel() {
  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ MongoDB connected successfully')
    
    // Import Review model
    console.log('2. Importing Review model...')
    const Review = (await import('./models/Review.js')).default
    console.log('✅ Review model imported successfully')
    
    // Test basic operations
    console.log('3. Testing database operations...')
    
    // Find all reviews
    const allReviews = await Review.find({})
    console.log(`✅ Found ${allReviews.length} reviews in database`)
    
    // Find pending reviews
    const pendingReviews = await Review.find({ status: 'pending' })
    console.log(`✅ Found ${pendingReviews.length} pending reviews`)
    
    // Test update operation
    if (pendingReviews.length > 0) {
      const testReview = pendingReviews[0]
      console.log(`✅ Testing update on review: ${testReview._id}`)
      
      // Update status
      await Review.findByIdAndUpdate(testReview._id, { 
        status: 'approved',
        moderatedAt: new Date(),
        moderatedBy: 'test-admin'
      })
      console.log('✅ Review status updated successfully')
      
      // Revert back to pending
      await Review.findByIdAndUpdate(testReview._id, { 
        status: 'pending',
        $unset: { moderatedAt: 1, moderatedBy: 1 }
      })
      console.log('✅ Review reverted to pending')
    } else {
      console.log('⚠️ No pending reviews to test with')
    }
    
    console.log('')
    console.log('=== REVIEW MODEL TEST COMPLETE ===')
    console.log('✅ Review model is working correctly')
    console.log('✅ Database operations are functional')
    
  } catch (error) {
    console.error('❌ Error testing Review model:', error.message)
    console.error('❌ Stack:', error.stack)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
  }
}

testReviewModel()
