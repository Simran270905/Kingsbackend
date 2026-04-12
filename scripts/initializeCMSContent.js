import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Content from '../models/Content.js'

dotenv.config()

const cmsContent = {
  home: {
    type: 'home',
    data: {
      announcement: 'Get 10% off on First Purchase',
      sections: [
        {
          id: 'chains',
          name: 'MOTI CHAINS',
          description: 'Elegant gold plated chains with pearl design'
        },
        {
          id: 'bracelets',
          name: 'BRACELETS',
          description: 'Beautiful traditional bracelets'
        },
        {
          id: 'rings',
          name: 'RINGS',
          description: 'Stunning rings for every occasion'
        },
        {
          id: 'kada',
          name: 'KADA',
          description: 'Traditional kada designs'
        },
        {
          id: 'bali',
          name: 'BALI',
          description: 'Classic bali earrings'
        },
        {
          id: 'pendals',
          name: 'PENDALS',
          description: 'Spiritual pendal designs'
        },
        {
          id: 'rudraksh',
          name: 'RUDRAKSH',
          description: 'Authentic rudraksh malas'
        }
      ]
    },
    metadata: {
      lastUpdated: new Date(),
      updatedBy: 'admin'
    },
    isPublished: true
  },
  footer: {
    type: 'footer',
    data: {
      brandName: 'KKings_Jewellery',
      tagline: 'Crafting timeless beauty since 2020',
      trustline: 'Trusted by thousands of customers nationwide',
      quickLinks: [
        { label: 'Home', url: '/' },
        { label: 'Shop All', url: '/shop' },
        { label: 'Our Story', url: '/our-story' },
        { label: 'My Account', url: '/account' }
      ],
      contact: {
        address: 'Mumbai, Maharashtra, India',
        phone: '+91 98765 43210',
        email: 'support@kkingsjewellery.com'
      },
      socialLinks: {
        instagram: 'https://instagram.com/kkingsjewellery',
        whatsapp: 'https://wa.me/919876543210'
      },
      copyright: '© {year} KKings_Jewellery. All rights reserved.'
    },
    metadata: {
      lastUpdated: new Date(),
      updatedBy: 'admin'
    },
    isPublished: true
  },
  ourStory: {
    type: 'our-story',
    data: {
      hero: {
        title: 'Our Story',
        subtitle: 'Crafting Dreams in Gold Since 2020'
      },
      story: `Welcome to KKings_Jewellery, where tradition meets modern elegance. 

Founded in 2020, we started with a simple mission: to bring affordable, high-quality gold plated jewellery to every household in India.

Our journey began in a small workshop in Mumbai, where our artisans carefully crafted each piece with love and dedication. Today, we've grown to serve thousands of customers across the country, but our commitment to quality and authenticity remains unchanged.

Every piece in our collection is:
• Crafted with precision and care
• Made from high-quality materials
• Designed to last for generations
• Affordably priced without compromising quality

We believe that everyone deserves to wear beautiful jewellery, and that's exactly what we offer - timeless pieces that make you feel special every day.`,
      values: [
        {
          title: 'Quality First',
          description: 'We never compromise on the quality of our materials and craftsmanship'
        },
        {
          title: 'Customer Trust',
          description: 'Your satisfaction and trust are our top priorities'
        },
        {
          title: 'Traditional Craftsmanship',
          description: 'Preserving age-old techniques while embracing modern designs'
        },
        {
          title: 'Affordability',
          description: 'Bringing premium jewellery at prices everyone can afford'
        }
      ],
      team: {
        title: 'Our Artisans',
        description: 'Meet the talented craftspeople who bring our designs to life'
      }
    },
    metadata: {
      lastUpdated: new Date(),
      updatedBy: 'admin'
    },
    isPublished: true
  }
}

async function initializeCMS() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('📝 Initializing CMS Content...\n')

    for (const [key, contentData] of Object.entries(cmsContent)) {
      const existing = await Content.findOne({ type: contentData.type })

      if (existing) {
        console.log(`⏭️  ${key}: Already exists, skipping`)
      } else {
        const newContent = new Content(contentData)
        await newContent.save()
        console.log(`✅ ${key}: Created successfully`)
      }
    }

    console.log('\n📊 CMS Content Summary:')
    const allContent = await Content.find()
    console.log(`Total content pages: ${allContent.length}`)
    allContent.forEach(content => {
      console.log(`  - ${content.type}: ${content.isPublished ? 'Published' : 'Draft'}`)
    })

    console.log('\n✅ CMS initialization complete!')
    console.log('\n📍 Next Steps:')
    console.log('1. Navigate to Admin Panel: http://localhost:5173/admin/cms/home')
    console.log('2. Edit Home page content')
    console.log('3. Navigate to: http://localhost:5173/admin/cms/footer')
    console.log('4. Edit Footer content')
    console.log('5. Navigate to: http://localhost:5173/admin/cms/our-story')
    console.log('6. Edit Our Story content')
    console.log('7. Check frontend to see changes reflected\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing CMS:', error)
    process.exit(1)
  }
}

initializeCMS()
