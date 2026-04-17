import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Content from './models/Content.js';

dotenv.config();

const footerContent = {
  brandName: 'KKings Jewellery',
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
  copyright: '© 2026 KKings Jewellery. All rights reserved.'
};

async function createFooterContent() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if footer content already exists
    const existingFooter = await Content.findOne({ type: 'footer' });
    
    if (existingFooter) {
      console.log('Footer content already exists, updating...');
      existingFooter.data = footerContent;
      existingFooter.metadata.lastUpdated = new Date();
      await existingFooter.save();
      console.log('Footer content updated successfully');
    } else {
      console.log('Creating new footer content...');
      const newFooter = new Content({
        type: 'footer',
        data: footerContent,
        metadata: {
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        isPublished: true
      });
      
      await newFooter.save();
      console.log('Footer content created successfully');
    }

    console.log('Footer content setup complete!');
    
  } catch (error) {
    console.error('Error creating footer content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createFooterContent();
