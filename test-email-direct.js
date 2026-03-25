// Direct email service test
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function testEmailDirect() {
  console.log('🧪 Direct Email Service Test...\n');

  try {
    console.log('🔧 Configuration:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length || 0);
    console.log('');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('📧 Testing connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'simrankadamkb12@gmail.com',
      subject: 'KKings Jewellery - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Test Email - KKings Jewellery</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666;">This is a test email to verify the SMTP configuration is working.</p>
            <p style="color: #666;">If you receive this, the email service is ready for OTP sending!</p>
          </div>
        </div>
      `
    });

    console.log('🎉 Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('📧 Check your inbox for the test email');

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - Possible solutions:');
      console.log('1. Enable 2FA on your Gmail account');
      console.log('2. Generate a new App Password from: https://myaccount.google.com/apppasswords');
      console.log('3. Ensure the App Password is correct (no spaces)');
      console.log('4. Check if "Less secure app access" is enabled (if using regular password)');
    }
  }
}

testEmailDirect();
