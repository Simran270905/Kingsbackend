import nodemailer from 'nodemailer'

export class EmailService {
  constructor() {
    this.transporter = null
  }

  async createTransporter() {
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS
    
    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not configured')
    }

    // Try SendGrid first
    if (process.env.SENDGRID_API_KEY) {
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
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  async sendEmail(to, subject, html) {
    try {
      const transporter = await this.createTransporter()
      await transporter.verify()
      
      const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER
      
      const result = await transporter.sendMail({
        from: emailUser,
        to,
        subject,
        html
      })
      
      return { success: true, messageId: result.messageId, response: result.response }
    } catch (error) {
      console.error('Email sending failed:', error.message)
      throw new Error(`Email service failed: ${error.message}`)
    }
  }

  async sendOTP(email, otp, name) {
    const subject = 'KKings Jewellery - OTP Verification'
    const html = `
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
    
    return this.sendEmail(email, subject, html)
  }
}

export default new EmailService()
