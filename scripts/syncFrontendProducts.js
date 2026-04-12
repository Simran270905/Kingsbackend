import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from '../models/Product.js'

dotenv.config()

// Sample products visible on frontend (from screenshots)
const frontendProducts = [
  {
    name: '1 Gram Gold Plated Chain - Moti Design',
    description: 'Beautiful 1 Gram Gold Plated Chain with Moti (Pearl) design. Perfect for traditional occasions.',
    price: 3499,
    selling_price: 2000,
    category: 'Chains',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-chain-1.jpg'],
    stock: 15,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 5,
    isActive: true,
    sku: 'MOTI-CHAIN-001'
  },
  {
    name: '1 Gram Gold Plated Chain - Classic Moti',
    description: 'Elegant 1 Gram Gold Plated Chain with classic Moti pattern. Ideal for daily wear.',
    price: 3499,
    selling_price: 3200,
    category: 'Chains',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-chain-2.jpg'],
    stock: 20,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 5.5,
    isActive: true,
    sku: 'MOTI-CHAIN-002'
  },
  {
    name: '1 Gram Gold Plated Chain - Diamond Pattern',
    description: 'Stunning 1 Gram Gold Plated Chain with diamond-cut pattern. Premium quality.',
    price: 2699,
    selling_price: 2300,
    category: 'Chains',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-chain-3.jpg'],
    stock: 12,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 6,
    isActive: true,
    sku: 'DIAMOND-CHAIN-001'
  },
  {
    name: '1 Gram Gold Plated Chain - Premium Moti',
    description: 'Premium 1 Gram Gold Plated Chain with intricate Moti design. Exclusive collection.',
    price: 3699,
    selling_price: 3200,
    category: 'Chains',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-chain-4.jpg'],
    stock: 18,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 5.8,
    isActive: true,
    sku: 'MOTI-CHAIN-003'
  },
  // Additional sample products for better catalog
  {
    name: 'Gold Plated Bracelet - Traditional',
    description: 'Traditional gold plated bracelet with ethnic design.',
    price: 2499,
    selling_price: 1999,
    category: 'Bracelets',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-bracelet-1.jpg'],
    stock: 25,
    hasSizes: true,
    sizes: [
      { size: 'S', stock: 8 },
      { size: 'M', stock: 10 },
      { size: 'L', stock: 7 }
    ],
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 8,
    isActive: true,
    sku: 'BRACELET-001'
  },
  {
    name: 'Gold Plated Ring - Floral Design',
    description: 'Elegant gold plated ring with beautiful floral pattern.',
    price: 1499,
    selling_price: 1199,
    category: 'Rings',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-ring-1.jpg'],
    stock: 30,
    hasSizes: true,
    sizes: [
      { size: '6', stock: 5 },
      { size: '7', stock: 10 },
      { size: '8', stock: 8 },
      { size: '9', stock: 7 }
    ],
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 3,
    isActive: true,
    sku: 'RING-001'
  },
  {
    name: 'Gold Plated Pendal - Om Design',
    description: 'Sacred Om design gold plated pendal for spiritual wear.',
    price: 1999,
    selling_price: 1599,
    category: 'Pendal',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-pendal-1.jpg'],
    stock: 20,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 4,
    isActive: true,
    sku: 'PENDAL-001'
  },
  {
    name: 'Gold Plated Kada - Sikh Design',
    description: 'Traditional Sikh kada in gold plated finish.',
    price: 2999,
    selling_price: 2499,
    category: 'Kada',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-kada-1.jpg'],
    stock: 15,
    hasSizes: true,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 6 },
      { size: 'L', stock: 4 }
    ],
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 12,
    isActive: true,
    sku: 'KADA-001'
  },
  {
    name: 'Gold Plated Bali - Traditional Earrings',
    description: 'Classic traditional bali earrings in gold plated finish.',
    price: 1799,
    selling_price: 1399,
    category: 'Bali',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-bali-1.jpg'],
    stock: 22,
    hasSizes: false,
    material: 'Gold',
    purity: '1 Gram Plated',
    weight: 2.5,
    isActive: true,
    sku: 'BALI-001'
  },
  {
    name: 'Rudraksh Mala - 5 Mukhi',
    description: 'Authentic 5 Mukhi Rudraksh mala for meditation and spiritual practice.',
    price: 2499,
    selling_price: 1999,
    category: 'Rudraksh',
    images: ['https://res.cloudinary.com/demo/image/upload/sample-rudraksh-1.jpg'],
    stock: 10,
    hasSizes: false,
    material: 'Other',
    purity: 'Natural',
    weight: 15,
    isActive: true,
    sku: 'RUDRAKSH-001'
  }
]

async function syncProducts() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    console.log('\n📊 Current products in database:')
    const existingProducts = await Product.find()
    console.log(`Found ${existingProducts.length} existing products`)

    console.log('\n🔄 Syncing frontend products to database...')
    
    let added = 0
    let skipped = 0

    for (const productData of frontendProducts) {
      // Check if product already exists by SKU or name
      const existing = await Product.findOne({
        $or: [
          { sku: productData.sku },
          { name: productData.name }
        ]
      })

      if (existing) {
        console.log(`⏭️  Skipped: ${productData.name} (already exists)`)
        skipped++
      } else {
        const product = new Product(productData)
        await product.save()
        console.log(`✅ Added: ${productData.name}`)
        added++
      }
    }

    console.log('\n📈 Sync Summary:')
    console.log(`✅ Added: ${added} products`)
    console.log(`⏭️  Skipped: ${skipped} products (already existed)`)
    console.log(`📦 Total in database: ${existingProducts.length + added} products`)

    console.log('\n✅ Sync complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error syncing products:', error)
    process.exit(1)
  }
}

syncProducts()
