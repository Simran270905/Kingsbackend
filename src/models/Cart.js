import mongoose from 'mongoose'

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        name: String,
        price: Number,
        originalPrice: Number,
        discountPercentage: {
          type: Number,
          default: 0
        },
        isOnSale: {
          type: Boolean,
          default: false
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1
        },
        selectedSize: String,
        image: String,
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    totalPrice: {
      type: Number,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

// Index for faster queries
cartSchema.index({ userId: 1 })

export default mongoose.model('Cart', cartSchema)
