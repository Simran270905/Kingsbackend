import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include in queries by default
    },
    addresses: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        streetAddress: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        mobile: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
      }
    ],
    wishlist: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        addedAt: { type: Date, default: Date.now }
      }
    ],
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date
  },
  { timestamps: true }
)

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcryptjs.genSalt(10)
    this.password = await bcryptjs.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare passwords
userSchema.methods.comparePassword = async function(passwordToCheck) {
  return await bcryptjs.compare(passwordToCheck, this.password)
}

userSchema.index({ isActive: 1 })

export default mongoose.model('User', userSchema)
