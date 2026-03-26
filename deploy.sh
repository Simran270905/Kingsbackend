#!/bin/bash

echo "🚀 Deploying KKings Jewellery Backend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run a quick health check
echo "🔍 Running health check..."
node -e "
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
console.log('✅ Environment variables loaded');
console.log('📧 Email User:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('🗄️ MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('☁️ Cloudinary:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set');
"

echo "✅ Backend is ready for deployment!"
echo ""
echo "📝 Next Steps:"
echo "1. Push this code to your GitHub repository"
echo "2. Connect your repository to Render.com"
echo "3. Use the render.yaml configuration file"
echo "4. Set environment variables in Render dashboard"
echo ""
echo "🌐 Backend will be deployed to: https://kkings-backend.onrender.com"
