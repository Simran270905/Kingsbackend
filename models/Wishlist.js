import mongoose from 'mongoose'

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
)

// Ensure one wishlist per user
wishlistSchema.index({ userId: 1 }, { unique: true })

// Prevent duplicate products in the same wishlist
wishlistSchema.pre('save', function (next) {
  const seen = new Set()
  this.products = this.products.filter((item) => {
    const id = item.productId.toString()
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  next()
})

export default mongoose.model('Wishlist', wishlistSchema)
