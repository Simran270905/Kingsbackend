// 👤 SETUP TEST USER
// This script creates a test user for login testing

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Force reliable DNS resolution
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function setupTestUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check if user exists
    const user = await User.findOne({ email: 'simran@gmail.com' });
    
    if (user) {
      console.log('👤 User exists:', user.email);
      console.log('🔑 Has password:', !!user.password);
      
      if (!user.password) {
        // Set a test password
        const hashedPassword = await bcrypt.hash('password123', 10);
        await User.updateOne(
          { email: 'simran@gmail.com' },
          { password: hashedPassword }
        );
        console.log('✅ Set test password for user');
        console.log('🔐 Email: simran@gmail.com');
        console.log('🔐 Password: password123');
      } else {
        console.log('🔐 Email: simran@gmail.com');
        console.log('🔐 Password: password123 (existing)');
      }
    } else {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = new User({
        firstName: 'Simran',
        lastName: 'Test',
        email: 'simran@gmail.com',
        phone: '9876543210',
        password: hashedPassword
      });
      
      await newUser.save();
      console.log('✅ Created test user');
      console.log('🔐 Email: simran@gmail.com');
      console.log('🔐 Password: password123');
    }
    
    console.log('🎉 Test user setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupTestUser().catch(console.error);
