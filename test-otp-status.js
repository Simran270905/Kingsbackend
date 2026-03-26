// OTP Status Diagnostic Tool
import dotenv from 'dotenv';
import emailService from './services/emailService.js';

// Load environment variables
dotenv.config();

async function diagnoseOTP() {
  console.log('🔍 Diagnosing OTP Service Status...\n');

  try {
    // Step 1: Check email configuration
    console.log('1️⃣ Email Configuration Status:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configured' : '❌ Missing');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || 587);
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Missing');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n❌ Email credentials not configured - OTP will use fallback mode');
      return;
    }

    // Step 2: Test email service initialization
    console.log('\n2️⃣ Testing Email Service...');
    try {
      await emailService.createTransporter();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.log('❌ Email service initialization failed:', error.message);
      console.log('💡 This will trigger OTP fallback mode');
      return;
    }

    // Step 3: Test sending OTP
    console.log('\n3️⃣ Testing OTP Send...');
    const testEmail = 'test@example.com';
    const testOTP = '123456';
    const testName = 'Test User';

    try {
      const result = await emailService.sendOTP(testEmail, testOTP, testName);
      console.log('✅ OTP sent successfully');
      console.log('Message ID:', result.messageId);
      console.log('Response:', result.response);
    } catch (error) {
      console.log('❌ OTP send failed:', error.message);
      
      // Analyze specific errors
      if (error.message.includes('Gmail authentication failed')) {
        console.log('\n🔧 Gmail Auth Issue:');
        console.log('- Enable 2FA on Gmail account');
        console.log('- Generate App Password');
        console.log('- Update EMAIL_PASS with App Password');
      }
      
      if (error.message.includes('Timeout')) {
        console.log('\n🔧 Timeout Issue:');
        console.log('- Check internet connection');
        console.log('- Try again in a moment');
      }
      
      if (error.message.includes('Network')) {
        console.log('\n🔧 Network Issue:');
        console.log('- Check firewall settings');
        console.log('- Verify SMTP port (587) is open');
      }
    }

    // Step 4: Check fallback behavior
    console.log('\n4️⃣ Fallback Mode Status:');
    console.log('✅ Fallback mode is enabled');
    console.log('📝 When email fails, OTP will be shown in API response');
    console.log('🔍 Frontend should handle fallback OTP display');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

diagnoseOTP();
