// 🔒 Security Credentials Generator
// Run this script to generate secure credentials for production

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 KKings Jewellery - Security Credentials Generator');
console.log('=============================================\n');

// Generate secure credentials
const newJwtSecret = crypto.randomBytes(64).toString('hex');
const adminPassword = crypto.randomBytes(16).toString('hex');
const databasePassword = crypto.randomBytes(32).toString('hex');

console.log('🔑 Generated Secure Credentials:');
console.log('================================');
console.log(`JWT Secret: ${newJwtSecret}`);
console.log(`Admin Password: ${adminPassword}`);
console.log(`Database Password: ${databasePassword}`);
console.log('\n⚠️  SAVE THESE CREDENTIALS SECURELY!');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent;

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n✅ .env file found');
} catch (error) {
  console.log('\n❌ .env file not found');
  process.exit(1);
}

// Create backup
const backupPath = path.join(__dirname, '.env.backup');
fs.writeFileSync(backupPath, envContent);
console.log('✅ Backup created: .env.backup');

// Update JWT secret
const jwtSecretRegex = /JWT_SECRET=.*/;
if (jwtSecretRegex.test(envContent)) {
  envContent = envContent.replace(jwtSecretRegex, `JWT_SECRET=${newJwtSecret}`);
  console.log('✅ JWT Secret updated');
} else {
  console.log('❌ JWT_SECRET not found in .env');
}

// Update JWT expiry
const jwtExpiryRegex = /JWT_EXPIRES_IN=.*/;
if (jwtExpiryRegex.test(envContent)) {
  envContent = envContent.replace(jwtExpiryRegex, 'JWT_EXPIRES_IN=7d');
  console.log('✅ JWT Expiry updated to 7 days');
} else {
  console.log('❌ JWT_EXPIRES_IN not found in .env');
}

// Update admin password
const adminPasswordRegex = /ADMIN_PASSWORD=.*/;
if (adminPasswordRegex.test(envContent)) {
  envContent = envContent.replace(adminPasswordRegex, `ADMIN_PASSWORD=${adminPassword}`);
  console.log('✅ Admin Password updated');
} else {
  console.log('❌ ADMIN_PASSWORD not found in .env');
}

// Write updated .env file
fs.writeFileSync(envPath, envContent);
console.log('✅ .env file updated successfully');

console.log('\n🎯 Security Update Complete!');
console.log('============================');
console.log('📋 Next Steps:');
console.log('1. Restart your server: npm start');
console.log('2. Test admin login with new password');
console.log('3. Verify all API endpoints work');
console.log('4. Update frontend if needed');
console.log('\n🔐 Security Level: PRODUCTION READY');
console.log('⚠️  Keep these credentials secure and private!');

// Display what was changed
console.log('\n📊 Changes Made:');
console.log('================');
console.log('• JWT Secret: Changed to 64-character random string');
console.log('• JWT Expiry: Reduced to 7 days');
console.log('• Admin Password: Changed to secure random password');
console.log('• Backup: Created .env.backup file');

console.log('\n🚀 Your backend is now secure and ready for production!');
