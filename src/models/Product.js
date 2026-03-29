import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    originalPrice: {
      type: Number,
      required: [true, 'Product original price is required'],
      min: [0, 'Original price must be positive']
    },
    sellingPrice: {
      type: Number,
      default: null
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    brand: {
      type: String,
      trim: true,
      default: null
    },
    images: {
      type: [String],
      validate: {
        validator: function(arr) {
          return arr.length <= 4
        },
        message: 'Product can have at most 4 images'
      },
      default: []
    },
    stock: {
      type: Number,
      required: true,
      default: 1,
      min: [0, 'Stock cannot be negative']
    },
    sizes: [{
      size: {
        type: String,
        required: true
      },
      stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }
    }],
    hasSizes: {
      type: Boolean,
      default: false
    },
    material: {
      type: String,
      enum: ['Gold', 'Silver', 'Platinum', 'Brass', 'Other'],
      default: 'Gold'
    },
    purity: {
      type: String,
      default: null
    },
    weight: {
      type: Number,
      min: 0,
      default: null
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    reviews: [reviewSchema],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    isBestSeller: {
      type: Boolean,
      default: false
    },
    isOnSale: {
      type: Boolean,
      default: false
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    salesCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
)

// Text index for full-text search
productSchema.index({ name: 'text', description: 'text', category: 'text' })
// Compound index for category-based sorted queries
productSchema.index({ category: 1, createdAt: -1 })
// Active product filtering
productSchema.index({ isActive: 1, createdAt: -1 })
// Best seller and sale filtering indexes
productSchema.index({ isBestSeller: 1, isActive: 1 })
productSchema.index({ isOnSale: 1, isActive: 1 })
productSchema.index({ salesCount: -1, isActive: 1 })

export default mongoose.model('Product', productSchema)
