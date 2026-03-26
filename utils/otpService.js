import crypto from 'crypto'
import nodemailer from 'nodemailer'
import axios from 'axios'

// Generate 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString()
}

// Hash OTP for secure storage
export const hashOTP = async (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Verify OTP
export const verifyOTP = async (inputOTP, hashedOTP) => {
  const inputHash = crypto.createHash('sha256').update(inputOTP).digest('hex')
  return inputHash === hashedOTP
}

// Email transporter configuration with multiple options
const createEmailTransporter = () => {
  // Check for required email credentials
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  
  if (!emailUser || !emailPass) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
  }
  
  // Try SendGrid first (more reliable on Render)
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Using SendGrid for email service')
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    })
  }
  
  // Fallback to Gmail
  console.log('📧 Using Gmail for email service')
  console.log('📧 Email user:', emailUser)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    // Add timeout and connection settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,     // 5 seconds
    socketTimeout: 10000,      // 10 seconds
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  })
}

// Send OTP via email with better error handling
export const sendEmailOTP = async (email, otp, name) => {
  try {
    console.log('📧 Attempting to send email to:', email)
    console.log('📧 OTP to send:', otp)
    
    const transporter = createEmailTransporter()
    
    // Verify transporter connection first
    console.log('📧 Verifying email transporter connection...')
    await transporter.verify()
    console.log('✅ Email transporter verified')
    
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    
    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'KKings Jewellery - OTP Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Welcome to KKings Jewellery</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #555; margin-bottom: 10px;">Your OTP Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; text-align: center; letter-spacing: 5px; padding: 20px; background: white; border-radius: 4px;">
              ${otp}
            </div>
            <p style="color: #666; text-align: center; margin-top: 15px;">This OTP will expire in 5 minutes</p>
          </div>
          <p style="color: #666;">Hello ${name},</p>
          <p style="color: #666;">Use the above OTP to complete your authentication. For security reasons, please do not share this code with anyone.</p>
          <p style="color: #666;">If you didn't request this OTP, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated message from KKings Jewellery. Please do not reply to this email.
          </p>
        </div>
      `
    }
    
    console.log('📧 Sending email with options:', { from: emailUser, to: email, subject: mailOptions.subject })
    
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully!')
    console.log('📧 Message ID:', result.messageId)
    console.log('📧 Response:', result.response)
    return { success: true, messageId: result.messageId, response: result.response }
  } catch (error) {
    console.error('❌ Email sending failed:')
    console.error('❌ Error code:', error.code)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error command:', error.command)
    console.error('❌ Error response:', error.response)
    
    // Log detailed error information for debugging
    if (error.code === 'EAUTH') {
      console.error('🔧 Authentication Error - Check EMAIL_USER and EMAIL_PASS')
    } else if (error.code === 'ECONNECTION') {
      console.error('🔧 Connection Error - Check SMTP_HOST and SMTP_PORT')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔧 Timeout Error - Check network connectivity')
    }
    
    throw new Error(`Email service failed: ${error.message}`)
  }
}

// Send OTP via SMS (Multiple SMS service options)
export const sendSMSOTP = async (phone, otp) => {
  try {
    // Option 1: Fast2SMS (if API key is configured)
    if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY !== 'your_fast2sms_api_key_here') {
      try {
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
          authorization: process.env.FAST2SMS_API_KEY,
          route: 'v3',
          sender_id: 'FTWSMS',
          message: `Your KKings Jewellery OTP is: ${otp}. Valid for 5 minutes.`,
          language: 'english',
          flash: 0,
          numbers: phone
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.data.return) {
          console.log(`✅ SMS sent successfully to ${phone} via Fast2SMS`)
          return true
        }
      } catch (fast2Error) {
        console.log('Fast2SMS failed, trying alternative method...')
      }
    }

    // Option 2: TextLocal (free testing - requires signup)
    if (process.env.TEXTLOCAL_API_KEY) {
      try {
        const response = await axios.post('https://api.textlocal.in/send/', {
          apikey: process.env.TEXTLOCAL_API_KEY,
          numbers: `91${phone}`,
          message: `Your KKings Jewellery OTP is: ${otp}. Valid for 5 minutes.`,
          sender: 'TXTLCL'
        })

        if (response.data.status === 'success') {
          console.log(`✅ SMS sent successfully to ${phone} via TextLocal`)
          return true
        }
      } catch (textlocalError) {
        console.log('TextLocal failed, trying next method...')
      }
    }

    // Option 3: Mock SMS service for development (simulates SMS sending)
    console.log(`📱 SMS OTP for ${phone}: ${otp}`)
    console.log('🔄 Using mock SMS service (development mode)')
    
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`✅ Mock SMS sent successfully to ${phone}`)
    return true
    
  } catch (error) {
    console.error('Error sending SMS OTP:', error.message)
    
    // Ultimate fallback: Always log the OTP
    console.log(`📱 Fallback SMS OTP for ${phone}: ${otp}`)
    
    // For development, return success even if SMS fails
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ SMS failed but continuing in development mode')
      return true
    }
    
    throw new Error('Failed to send OTP via SMS')
  }
}
