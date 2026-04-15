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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
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

// Pre-save hook to calculate discount percentage correctly
productSchema.pre('save', function(next) {
  // Calculate discount only if both prices exist and selling price is less than original price
  if (this.sellingPrice && this.originalPrice && this.sellingPrice < this.originalPrice) {
    this.discountPercentage = ((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100
    this.discountPercentage = Math.round(this.discountPercentage * 100) / 100 // Round to 2 decimal places
    this.isOnSale = true
  } else {
    this.discountPercentage = 0
    this.isOnSale = false
  }
  next()
})

// Pre-update hook to calculate discount percentage correctly
productSchema.pre(['findOneAndUpdate', 'findByIdAndUpdate'], function(next) {
  const update = this.getUpdate()
  console.log('Pre-update hook called with update:', update)
  
  // Check if sellingPrice is being updated
  if (update.sellingPrice || update.$set?.sellingPrice) {
    const newSellingPrice = update.sellingPrice || update.$set?.sellingPrice
    const originalPrice = update.originalPrice || update.$set?.originalPrice || this.originalPrice || this.getQuery().originalPrice
    
    console.log('Pre-update: checking prices', { newSellingPrice, originalPrice })
    
    if (newSellingPrice && originalPrice && newSellingPrice < originalPrice) {
      const discountPercentage = ((originalPrice - newSellingPrice) / originalPrice) * 100
      const roundedDiscount = Math.round(discountPercentage * 100) / 100
      
      if (update.$set) {
        update.$set.discountPercentage = roundedDiscount
        update.$set.isOnSale = true
      } else {
        update.discountPercentage = roundedDiscount
        update.isOnSale = true
      }
    } else {
      if (update.$set) {
        update.$set.discountPercentage = 0
        update.$set.isOnSale = false
      } else {
        update.discountPercentage = 0
        update.isOnSale = false
      }
    }
  }
  next()
})

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
