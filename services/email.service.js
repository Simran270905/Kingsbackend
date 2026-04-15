import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

// Send order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  const transporter = createTransporter()
  
  const itemsList = order.items.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px;" />
        <span style="vertical-align: middle;">${item.name}</span>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.quantity).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
    </tr>`
  ).join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - KKings Jewellery</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background: linear-gradient(135deg, #d4af37, #f4e4bc);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
          margin-bottom: 0;
        }
        .header h1 {
          color: #333;
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header .subtitle {
          color: #555;
          margin: 5px 0 0 0;
          font-size: 16px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .order-id {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          border: 2px solid #d4af37;
        }
        .order-id strong {
          color: #d4af37;
          font-size: 24px;
          font-weight: 600;
        }
        .section-title {
          color: #333;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #d4af37;
        }
        .address-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #d4af37;
        }
        .summary-row td {
          font-weight: 600;
          border-top: 2px solid #d4af37;
        }
        .total-row {
          background: #f8f9fa;
          font-size: 18px;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          color: #666;
          font-size: 14px;
        }
        .tracking-info {
          background: #e8f5e8;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #28a745;
        }
        .contact-info {
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #ffc107;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>KKings Jewellery</h1>
        <p class="subtitle">Exquisite Jewellery, Exceptional Service</p>
      </div>
      
      <div class="content">
        <h2 style="color: #28a745; text-align: center; margin-bottom: 20px;">Your Order is Confirmed! Thank You!</h2>
        
        <div class="order-id">
          <div>Order ID: <strong>${order.orderId}</strong></div>
        </div>

        <div class="section-title">Order Details</div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
            <tr class="summary-row">
              <td colspan="3" style="padding: 10px; text-align: right;">Subtotal:</td>
              <td style="padding: 10px; text-align: right;">${order.subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;">Shipping:</td>
              <td style="padding: 10px; text-align: right;">${order.shippingCharge.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
            </tr>
            ${order.discount > 0 ? `
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;">Discount:</td>
              <td style="padding: 10px; text-align: right; color: #28a745;">-${order.discount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
            </tr>` : ''}
            <tr class="total-row">
              <td colspan="3" style="padding: 15px; text-align: right;">Total Amount:</td>
              <td style="padding: 15px; text-align: right; color: #d4af37;">${order.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Shipping Address</div>
        <div class="address-box">
          <div><strong>${order.customer.name}</strong></div>
          <div>${order.customer.address.line1}</div>
          ${order.customer.address.line2 ? `<div>${order.customer.address.line2}</div>` : ''}
          <div>${order.customer.address.city}, ${order.customer.address.state} - ${order.customer.address.pincode}</div>
          <div>${order.customer.address.country}</div>
          <div style="margin-top: 10px;">
            <strong>Phone:</strong> ${order.customer.phone}<br>
            <strong>Email:</strong> ${order.customer.email}
          </div>
        </div>

        <div class="section-title">Payment Information</div>
        <div class="address-box">
          <div><strong>Payment Method:</strong> ${order.payment.method}</div>
          <div><strong>Payment Status:</strong> <span style="color: #28a745; font-weight: 600;">${order.payment.status}</span></div>
          <div><strong>Transaction ID:</strong> ${order.payment.razorpayPaymentId}</div>
          <div><strong>Payment Date:</strong> ${new Date(order.payment.paidAt).toLocaleString('en-IN', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>

        ${order.shipping.awbCode ? `
        <div class="tracking-info">
          <strong>Tracking Information:</strong><br>
          AWB Number: ${order.shipping.awbCode}<br>
          Courier: ${order.shipping.courierName}<br>
          ${order.shipping.trackingUrl ? `<a href="${order.shipping.trackingUrl}" style="color: #d4af37; text-decoration: none; font-weight: 600;">Track Your Order</a>` : ''}
        </div>` : `
        <div class="tracking-info">
          <strong>Shipping Status:</strong> Your order is being processed for shipment. You will receive tracking details once your order is shipped.
        </div>`}

        <div class="contact-info">
          <strong>Need Help?</strong><br>
          Email us at: support@kkingsjewellery.com<br>
          Call us at: +91-XXXXXXXXXX
        </div>

        <div class="footer">
          <p>This is an automated confirmation email. Please do not reply to this message.</p>
          <p>&copy; 2024 KKings Jewellery. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const mailOptions = {
    from: `"KKings Jewellery" <${SMTP_USER}>`,
    to: order.customer.email,
    subject: `Order Confirmed - ${order.orderId} | KKings Jewellery`,
    html: htmlContent
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Order confirmation email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    throw new Error('Failed to send order confirmation email')
  }
}

// Send shipping update email
const sendShippingUpdateEmail = async (order) => {
  const transporter = createTransporter()
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shipping Update - KKings Jewellery</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background: linear-gradient(135deg, #d4af37, #f4e4bc);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
          margin-bottom: 0;
        }
        .header h1 {
          color: #333;
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .tracking-info {
          background: #e8f5e8;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        .tracking-button {
          display: inline-block;
          background: #d4af37;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>KKings Jewellery</h1>
      </div>
      
      <div class="content">
        <h2 style="color: #28a745; text-align: center;">Your Order Has Been Shipped!</h2>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #d4af37;">
          <div>Order ID: <strong style="color: #d4af37; font-size: 20px;">${order.orderId}</strong></div>
        </div>

        <div class="tracking-info">
          <h3 style="margin-top: 0;">Tracking Details</h3>
          <div><strong>AWB Number:</strong> ${order.shipping.awbCode}</div>
          <div><strong>Courier:</strong> ${order.shipping.courierName}</div>
          <div><strong>Current Status:</strong> ${order.shipping.status}</div>
          ${order.shipping.estimatedDelivery ? `<div><strong>Estimated Delivery:</strong> ${new Date(order.shipping.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
          
          ${order.shipping.trackingUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${order.shipping.trackingUrl}" class="tracking-button">Track Your Order</a>
          </div>` : ''}
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>Important:</strong> Please keep your order ID handy for any future correspondence. The tracking link above will show you real-time updates about your shipment.
        </div>

        <div class="footer">
          <p>Thank you for choosing KKings Jewellery!</p>
          <p>&copy; 2024 KKings Jewellery. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const mailOptions = {
    from: `"KKings Jewellery" <${SMTP_USER}>`,
    to: order.customer.email,
    subject: `Order Shipped - ${order.orderId} | KKings Jewellery`,
    html: htmlContent
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Shipping update email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending shipping update email:', error)
    throw new Error('Failed to send shipping update email')
  }
}

export {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail
}
