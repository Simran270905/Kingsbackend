// Test email service
import { sendEmailOTP } from './utils/otpService.js';

async function testEmailService() {
  try {
    console.log('🧪 Testing email service...');
    await sendEmailOTP('test@example.com', '123456', 'Test User');
    console.log('✅ Email service working!');
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEmailService();
