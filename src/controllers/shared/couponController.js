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
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      })
    }

    if (!coupon.canBeUsedBy(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon or it is no longer available'
      })
    }

    if (coupon.minOrderAmount > orderAmount) {
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
