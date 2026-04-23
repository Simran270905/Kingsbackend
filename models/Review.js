// NEW FILE
import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true,
    comment: 'Order ID from the Order model'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
    comment: 'Product ID being reviewed'
  },
  email: {
    type: String,
    required: true,
    index: true,
    match: /.+@.+\..+/,
    comment: 'Customer email (from order)'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    comment: 'Star rating (1-5)'
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true,
    comment: 'Review comment (max 1000 chars)'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
    comment: 'Review moderation status'
  },
  verifiedPurchase: {
    type: Boolean,
    default: true,
    comment: 'Automatically true for token-based submissions'
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Number of "helpful" votes'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    comment: 'Admin who moderated this review'
  },
  moderatedAt: {
    type: Date,
    default: null,
    comment: 'When review was moderated'
  },
  moderationNote: {
    type: String,
    maxlength: 500,
    default: null,
    comment: 'Admin note for moderation'
  },
  // ADD THIS FIELD (optional)
  images: [{
    url: {
      type: String,
      required: true,
      comment: 'Cloudinary image URL'
    },
    public_id: {
      type: String,
      required: true,
      comment: 'Cloudinary public ID for deletion'
    }
  }]
}, {
  timestamps: true,
  comment: 'Product reviews with verified purchase protection'
})

// Prevent duplicate reviews for same order and product
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true })

// Fast product queries with status filter
reviewSchema.index({ productId: 1, status: 1 })

// Email-based queries for customer review history
reviewSchema.index({ email: 1, status: 1 })

// Date-based queries for sorting
reviewSchema.index({ createdAt: -1 })

// Compound index for admin dashboard
reviewSchema.index({ status: 1, createdAt: -1 })

// Text search for admin moderation
reviewSchema.index({ comment: 'text', email: 'text' })

// Pre-save middleware for validation
reviewSchema.pre('save', function(next) {
  // Ensure comment is not empty after trimming
  if (this.comment && this.comment.trim().length === 0) {
    this.comment = null
  }
  
  // Auto-approve if rating is 4+ and comment is reasonable
  if (this.status === 'pending' && !this.moderatedBy) {
    if (this.rating >= 4 && this.comment && this.comment.length >= 10) {
      this.status = 'approved'
    }
  }
  
  next()
})

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Virtual for display name (first part of email)
reviewSchema.virtual('displayName').get(function() {
  const emailParts = this.email.split('@')
  return emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1).toLowerCase()
})

// Ensure virtuals are included in JSON
reviewSchema.set('toJSON', { virtuals: true })
reviewSchema.set('toObject', { virtuals: true })

// Static methods for common queries
reviewSchema.statics.getApprovedByProduct = function(productId, page = 1, limit = 10) {
  return this.find({ productId, status: 'approved' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
}

reviewSchema.statics.getProductStats = function(productId) {
  return this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    },
    {
      $addFields: {
        ratingCounts: {
          $reduce: {
            input: [1, 2, 3, 4, 5],
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $arrayToObject: [
                    [
                      {
                        k: { $toString: '$$this' },
                        v: {
                          $size: {
                            $filter: {
                              input: '$ratingDistribution',
                              cond: { $eq: ['$$this', '$$this'] }
                            }
                          }
                        }
                      }
                    ]
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ])
}

reviewSchema.statics.getPendingReviews = function(page = 1, limit = 20) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('productId', 'name images')
    .lean()
}

reviewSchema.statics.checkExistingReview = function(orderId, productId) {
  return this.findOne({ orderId, productId })
    .lean()
}

const ReviewModel = mongoose.model('Review', reviewSchema)

export default ReviewModel
