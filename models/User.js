import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: false, // Made optional for OTP-based registration
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required for authentication'],
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
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

userSchema.index({ isActive: 1 })

export default mongoose.model('User', userSchema)
