import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Selling price (what customer pays)'
  },
  purchasePrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
    comment: 'Cost price (internal use only)'
  },
  profitPerUnit: {
    type: Number,
    required: false,
    default: 0,
    comment: 'Profit per unit (sellingPrice - purchasePrice)'
  },
  totalProfit: {
    type: Number,
    required: false,
    default: 0,
    comment: 'Total profit for this item (profitPerUnit * quantity)'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedSize: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Subtotal for this item (price * quantity)'
  }
})

const orderSchema = new mongoose.Schema(
  {
        items: [orderItemSchema],
    customer: {
      firstName: {
        type: String,
        required: false
      },
      lastName: {
        type: String,
        required: false
      },
      name: {
        type: String,
        required: false
      },
      email: {
        type: String,
        required: false,
        match: /.+@.+\..+/
      },
      phone: {
        type: String,
        required: false
      },
      mobile: {
        type: String,
        required: false,
        match: /^[0-9]{10}$/
      }
    },
    guestInfo: {
      firstName: {
        type: String,
        required: false
      },
      lastName: {
        type: String,
        required: false
      },
      email: {
        type: String,
        required: false,
        match: /.+@.+\..+/
      },
      mobile: {
        type: String,
        required: false,
        match: /^[0-9]{10}$/
      },
      streetAddress: {
        type: String,
        required: false
      },
      city: {
        type: String,
        required: false
      },
      state: {
        type: String,
        required: false
      },
      zipCode: {
        type: String,
        required: false,
        match: /^[0-9]{6}$/
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponCode: {
      type: String,
      default: null
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'razorpay', 'upi', 'card'],
      default: 'cod'
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },
    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    trackingNumber: {
      type: String,
      default: null
    },
    shipmentId: {
      type: String,
      default: null
    },
    trackingUrl: {
      type: String,
      default: null
    },
    shiprocketOrderId: {
      type: String,
      default: null
    },
    awbCode: {
      type: String,
      default: null
    },
    courierName: {
      type: String,
      default: null
    },
    shippingStatus: {
      type: String,
      enum: ['not_created', 'pending', 'created', 'shipped', 'delivered', 'failed'],
      default: 'not_created'
    },
    estimatedDelivery: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      default: null
    },
    // Payment method discount fields (optional)
    originalAmount: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Original amount before any payment method discount'
    },
    discountedAmount: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Final amount after payment method discount (if applicable)'
    },
    discountType: {
      type: String,
      enum: ['coupon', 'payment_method', null],
      default: null,
      comment: 'Type of discount applied'
    },
    paymentMethodDiscount: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Discount amount from payment method (UPI/Netbanking)'
    },
    paymentMethodDiscountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Discount percentage from payment method'
    },
    // Payment plan fields (optional)
    paymentPlan: {
      type: String,
      enum: ['full', 'partial'],
      default: 'full',
      comment: 'Payment plan type: full or partial payment'
    },
    // Discount information
    originalAmount: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Original amount before any discount'
    },
    discountApplied: {
      type: Boolean,
      default: false,
      comment: 'Whether discount was applied'
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Discount percentage applied'
    },
    discountedTotal: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Final amount after discount'
    },
    // Partial payment breakdown (10/90 split)
    advancePercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      comment: 'Advance payment percentage'
    },
    advanceAmount: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Advance amount paid for partial payment plan'
    },
    remainingPercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      comment: 'Remaining payment percentage'
    },
    remainingAmount: {
      type: Number,
      default: null,
      min: 0,
      comment: 'Remaining amount to be paid for partial payment plan'
    },
    remainingPaymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
      comment: 'Status of remaining payment for partial payment plan'
    },
    remainingPaymentDate: {
      type: Date,
      default: null,
      comment: 'Date when remaining payment was completed'
    },
    // COD charge field
    codCharge: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'COD handling charge (₹150 for COD orders, 0 for others)'
    }
  },
  { timestamps: true }
)

orderSchema.index({ 'customer.email': 1 })
orderSchema.index({ 'shippingAddress.email': 1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })

export default mongoose.model('Order', orderSchema)
