import dotenv from 'dotenv'
import mongoose from 'mongoose'
import connectDB from '../config/database.js'

// Load environment variables
dotenv.config()

// Create indexes for optimal performance
const createIndexes = async () => {
  try {
    await connectDB()
    console.log('Connected to MongoDB')

    const db = mongoose.connection.db
    const productsCollection = db.collection('products')

    // Create index on category field for similar products query
    console.log('Creating category index...')
    await productsCollection.createIndex({ category: 1 })
    console.log('Category index created')

    // Create compound index for category + isActive for better query performance
    console.log('Creating compound index (category + isActive)...')
    await productsCollection.createIndex({ category: 1, isActive: 1 })
    console.log('Compound index created')

    // Create index for product lookup by ID
    console.log('Creating _id index (should already exist)...')
    // Note: _id index is automatically created by MongoDB

    // Create index for sorting by createdAt
    console.log('Creating createdAt index...')
    await productsCollection.createIndex({ createdAt: -1 })
    console.log('CreatedAt index created')

    // List all indexes to verify
    console.log('\nCurrent indexes on products collection:')
    const indexes = await productsCollection.listIndexes().toArray()
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key))
    })

    console.log('\nAll indexes created successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

createIndexes()
