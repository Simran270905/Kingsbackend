import Razorpay from 'razorpay'

export class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  }

  async createOrder(amount, currency = 'INR', receipt = null) {
    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1
      }

      const order = await this.razorpay.orders.create(options)
      return { success: true, order }
    } catch (error) {
      console.error('Razorpay order creation failed:', error)
      throw new Error('Failed to create payment order')
    }
  }

  async verifyPayment(paymentId, orderId, signature) {
    try {
      const crypto = require('crypto')
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      return generatedSignature === signature
    } catch (error) {
      console.error('Payment verification failed:', error)
      throw new Error('Payment verification failed')
    }
  }

  async capturePayment(paymentId, amount) {
    try {
      const result = await this.razorpay.payments.capture(paymentId, amount * 100, 'INR')
      return { success: true, payment: result }
    } catch (error) {
      console.error('Payment capture failed:', error)
      throw new Error('Failed to capture payment')
    }
  }

  async refundPayment(paymentId, amount = null) {
    try {
      const options = amount ? { amount: amount * 100 } : {}
      const refund = await this.razorpay.payments.refund(paymentId, options)
      return { success: true, refund }
    } catch (error) {
      console.error('Refund failed:', error)
      throw new Error('Failed to process refund')
    }
  }
}

export default new PaymentService()
