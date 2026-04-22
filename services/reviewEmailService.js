// AUTOMATIC REVIEW EMAIL SERVICE
import { generateReviewLink } from '../utils/generateReviewLink.js'
import nodemailer from 'nodemailer'

// Email transporter (using your existing email setup)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'kkingsjewellery@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
})

/**
 * Send review request email automatically when order is delivered
 * @param {Object} order - Order object with customer info
 * @returns {Promise<boolean>} - Success status
 */
export async function sendReviewEmail(order) {
  try {
    // Validate order has required fields
    if (!order._id || !order.guestInfo?.email) {
      console.error('Order missing required fields for review email:', order._id)
      return false
    }

    // Generate secure review link
    const reviewLink = generateReviewLink(
      order._id.toString(),
      order.guestInfo.email,
      order.deliveredAt || new Date()
    )

    if (!reviewLink) {
      console.error('Failed to generate review link for order:', order._id)
      return false
    }

    // Get customer name
    const customerName = order.guestInfo.firstName || order.customer?.name || 'Valued Customer'

    // Email content
    const emailContent = {
      from: process.env.EMAIL_USER || 'kkingsjewellery@gmail.com',
      to: order.guestInfo.email,
      subject: `How was your KKINGS Jewellery experience? Order #${order._id.toString().slice(-8)}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #8B7355 0%, #D4AF37 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">KKINGS Jewellery</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your Trusted Jewellery Partner</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${customerName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Thank you for your recent order from KKINGS Jewellery! We hope you're absolutely loving your new jewelry pieces.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #D4AF37; margin: 25px 0;">
              <p style="margin: 0; color: #333;">
                <strong>Order #${order._id.toString().slice(-8)}</strong> has been successfully delivered!
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Your feedback means the world to us and helps other customers make confident decisions. Would you take a moment to share your experience?
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${reviewLink}" 
                 style="background: linear-gradient(135deg, #8B7355 0%, #D4AF37 100%); 
                        color: white; padding: 15px 35px; text-decoration: none; 
                        border-radius: 50px; font-weight: bold; font-size: 16px;
                        display: inline-block; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                Write Your Review
              </a>
            </div>
            
            <div style="background: #fff9e6; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: #8B7355; margin-top: 0; font-size: 16px;">Why Your Review Matters:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Help other jewelry lovers choose their perfect pieces</li>
                <li>Share your authentic experience with the KKINGS community</li>
                <li>Help us continue to improve our service and products</li>
              </ul>
            </div>
            
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Important:</strong> This review link is personal and secure. It will expire in 7 days for your protection.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Questions about your order or need assistance? Just reply to this email - we're here to help!
            </p>
            
            <div style="border-top: 1px solid #eee; padding-top: 25px; margin-top: 30px;">
              <p style="margin: 0; color: #333; font-weight: bold;">Best regards,</p>
              <p style="margin: 5px 0; color: #666;">The KKINGS Jewellery Team</p>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                <a href="https://kings-main.vercel.app" style="color: #8B7355; text-decoration: none;">Visit Our Store</a> | 
                <a href="mailto:support@kkingsjewellery.com" style="color: #8B7355; text-decoration: none;">Contact Support</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 KKINGS Jewellery. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    }

    // Send email
    const result = await transporter.sendMail(emailContent)
    
    console.log(`Review email sent to ${order.guestInfo.email} for order ${order._id}`)
    console.log(`Message ID: ${result.messageId}`)
    
    return true
  } catch (error) {
    console.error('Failed to send review email:', error)
    return false
  }
}

/**
 * Send review emails for multiple orders (bulk)
 * @param {Array} orders - Array of order objects
 * @returns {Object} - Results summary
 */
export async function sendBulkReviewEmails(orders) {
  const results = {
    success: 0,
    failed: 0,
    total: orders.length,
    errors: []
  }

  for (const order of orders) {
    try {
      const success = await sendReviewEmail(order)
      if (success) {
        results.success++
      } else {
        results.failed++
        results.errors.push(`Order ${order._id}: Failed to send`)
      }
    } catch (error) {
      results.failed++
      results.errors.push(`Order ${order._id}: ${error.message}`)
    }
  }

  console.log('Bulk review email results:', results)
  return results
}

export default {
  sendReviewEmail,
  sendBulkReviewEmails
}
