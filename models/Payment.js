import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    // Razorpay Order
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true
    },
    // Razorpay Payment
    razorpayPaymentId: String,
    razorpaySignature: String,
    
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      default: 'razorpay'
    },
    
    // Payment details
    customerEmail: String,
    customerPhone: String,
    
    // Error info if payment fails
    errorCode: String,
    errorDescription: String,
    
    // Refund info
    refundId: String,
    refundStatus: String,
    refundAmount: Number,
    
    // Verification
    isSignatureVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  },
  { timestamps: true }
)

// Indexes for queries (unique: true creates index automatically for razorpayOrderId)
paymentSchema.index({ orderId: 1 })
paymentSchema.index({ userId: 1 })
paymentSchema.index({ status: 1 })

export default mongoose.model('Payment', paymentSchema)
