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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    items: [orderItemSchema],
    customer: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        match: /.+@.+\..+/
      },
      mobile: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
      },
      streetAddress: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true,
        match: /^[0-9]{6}$/
      }
    },
    shippingAddress: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        match: /.+@.+\..+/
      },
      mobile: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
      },
      streetAddress: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true,
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
    shippingStatus: {
      type: String,
      enum: ['pending', 'created', 'failed'],
      default: 'pending'
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
    }
  },
  { timestamps: true }
)

orderSchema.index({ 'customer.email': 1 })
orderSchema.index({ 'shippingAddress.email': 1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })

export default mongoose.model('Order', orderSchema)
