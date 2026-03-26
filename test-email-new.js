// Test email service directly
import nodemailer from 'nodemailer';

async function testEmailService() {
  console.log('🧪 Testing email service...');
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'simrankadamkb12@gmail.com',
        pass: 'utau alvo enjq upod'
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('📧 Testing transporter connection...');
    await transporter.verify();
    console.log('✅ Transporter verified successfully');
    
    // Send test email
    const mailOptions = {
      from: 'simrankadamkb12@gmail.com',
      to: 'harshrawal1144@gmail.com',
      subject: 'Test Email - KKings Jewellery',
      html: '<h1>Test Email</h1><p>This is a test email from KKings Jewellery.</p>'
    };
    
    console.log('📧 Sending test email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error command:', error.command);
    if (error.response) {
      console.error('❌ Server response:', error.response);
    }
  }
}

testEmailService();
