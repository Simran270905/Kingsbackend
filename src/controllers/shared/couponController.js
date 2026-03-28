import Coupon from '../models/Coupon.js'

export const createCoupon = async (req, res) => {
  try {
    console.log('🔍 DEBUG: createCoupon called')
    console.log('🔍 DEBUG: req.body:', req.body)
    console.log('🔍 DEBUG: req.admin:', req.admin)
    
    // ✅ ADMIN AUTHENTICATION CHECK
    if (!req.admin || req.admin.role !== 'admin') {
      console.error('❌ DEBUG: Admin authentication required')
      return res.status(403).json({
        success: false,
        message: 'Admin authentication required'
      })
    }
    
    const coupon = await Coupon.create(req.body)
    console.log('✅ DEBUG: Coupon created successfully:', coupon)
    
    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    })
  } catch (error) {
    console.error('❌ DEBUG: createCoupon error:', error.message)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      data: coupons
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const getCouponByCode = async (req, res) => {
  try {
    const { code } = req.params
    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      })
    }

    res.json({
      success: true,
      data: coupon
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const validateCoupon = async (req, res) => {
  try {
    const { code, userId, orderAmount } = req.body
    
    console.log('🔍 DEBUG: Validating coupon:', { code, userId, orderAmount })
    console.log('🔍 DEBUG: Request headers:', req.headers)
    
    // ✅ ADDED: Validate input parameters
    if (!code) {
      console.log('❌ DEBUG: Missing coupon code')
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      })
    }

    if (!orderAmount || orderAmount <= 0) {
      console.log('❌ DEBUG: Invalid order amount:', orderAmount)
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required'
      })
    }
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    console.log('🔍 DEBUG: Coupon found:', coupon ? 'YES' : 'NO')
    
    if (!coupon) {
      console.log('❌ DEBUG: Coupon not found for code:', code)
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      })
    }

    console.log('🔍 DEBUG: Coupon details:', {
      code: coupon.code,
      isActive: coupon.isActive,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit
    })

    // ✅ ADDED: Check if coupon is active
    if (!coupon.isActive) {
      console.log('❌ DEBUG: Coupon is not active')
      return res.status(400).json({
        success: false,
        message: 'Coupon is not active'
      })
    }

    // ✅ ADDED: Check expiry
    const now = new Date()
    if (coupon.validFrom > now) {
      console.log('❌ DEBUG: Coupon not yet valid')
      return res.status(400).json({
        success: false,
        message: 'Coupon is not yet valid'
      })
    }

    if (coupon.validUntil < now) {
      console.log('❌ DEBUG: Coupon has expired')
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      })
    }

    if (!coupon.canBeUsedBy(userId)) {
      console.log('❌ DEBUG: Coupon cannot be used by user:', userId)
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon or it is no longer available'
      })
    }

    if (coupon.minOrderAmount > orderAmount) {
      console.log('❌ DEBUG: Order amount too low:', orderAmount, 'required:', coupon.minOrderAmount)
      return res.status(400).json({
        success: false,
        message: `Minimum order amount ₹${coupon.minOrderAmount} required`
      })
    }

    let discountAmount = 0
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100)
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount
      }
    } else {
      discountAmount = coupon.discountValue
    }

    // Ensure discount doesn't exceed order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount
    }

    console.log('✅ DEBUG: Coupon validation successful:', {
      discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    })

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountAmount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    })
  } catch (error) {
    console.error('❌ DEBUG: Coupon validation error:', error.message)
    console.error('❌ DEBUG: Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const coupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    })

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      })
    }

    res.json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully'
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const coupon = await Coupon.findByIdAndDelete(id)

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      })
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const incrementCouponUsage = async (couponCode, userId) => {
  try {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })
    if (coupon) {
      coupon.usedCount += 1
      if (userId) {
        coupon.usedBy.push({ userId })
      }
      await coupon.save()
    }
  } catch (error) {
    console.error('Error incrementing coupon usage:', error)
  }
}
